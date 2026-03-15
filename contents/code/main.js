// Kyanite | Smart dynamic workspace management for Plasma 6 

const MIN_DESKTOPS = 1;
const LOG_LEVEL = 2;

function log(...args) { print("[kyanite]", ...args); }
function debug(...args) { if (LOG_LEVEL <= 1) log(...args); }
function trace(...args) { if (LOG_LEVEL <= 0) log(...args); }

let animationGuard = false;
let isDragging = false;


let pendingNewDesktop = new Set();


let lastDesktopTrigger = new WeakMap();



const compat = {
    addDesktop: () => {
        if (isDragging) return; 
        workspace.createDesktop(workspace.desktops.length, undefined);
    },

    windowAddedSignal: ws => ws.windowAdded,
    windowList: ws => ws.windowList(),

    desktopChangedSignal: client => client.desktopsChanged,

    workspaceDesktops: () => workspace.desktops,

    lastDesktop: () => {
        const ds = workspace.desktops;
        return ds.length ? ds[ds.length - 1] : null;
    },

    deleteLastDesktop: () => {
        if (isDragging) return; 

        try {
            animationGuard = true;

            const desktops = workspace.desktops;
            if (!desktops.length) return;

            const last = desktops[desktops.length - 1];
            if (!last) return;

            const current = workspace.currentDesktop;
            if (!current) return;

            const idx = desktops.indexOf(current);

            const fallback =
                (idx + 1 < desktops.length || idx === -1)
                ? desktops[idx + 1]
                : current;

            if (fallback) workspace.currentDesktop = fallback;

            workspace.removeDesktop(last);

            if (current && current !== last) {
                workspace.currentDesktop = current;
            }

        } finally {
            animationGuard = false;
        }
    },

    clientDesktops: c => c.desktops,
    setClientDesktops: (c, ds) => { c.desktops = ds; },
    clientOnDesktop: (c, d) => d && c.desktops.indexOf(d) !== -1,

    desktopAmount: () => workspace.desktops.length,
};



workspace.windowStartUserMoved.connect(() => {
    isDragging = true;
});

workspace.windowFinishUserMoved.connect(() => {
    isDragging = false;


    if (pendingNewDesktop.size > 0) {
        compat.addDesktop();
        pendingNewDesktop.clear();
    }

    compactPreservingIndex();
});



function desktopIsEmpty(idx) {
    const desktops = compat.workspaceDesktops();
    const d = desktops[idx];
    if (!d) return true;

    const clients = compat.windowList(workspace);

    for (const c of clients) {
        if (!c.desktops || !c.desktops.length) continue;

        if (
            compat.clientOnDesktop(c, d) &&
            !c.skipPager &&
            !c.onAllDesktops
        ) {
            return false;
        }
    }
    return true;
}



function compactFromEnd() {
    if (animationGuard || isDragging) return;

    animationGuard = true;
    try {
        const desktops = compat.workspaceDesktops();
        const lastIdx = desktops.length - 1;

        for (let i = lastIdx - 1; i >= 0; i--) {
            if (compat.desktopAmount() <= MIN_DESKTOPS) break;

            if (desktopIsEmpty(i)) {
                shiftWindowsDown(i);
                compat.deleteLastDesktop();
            }
        }

    } finally {
        animationGuard = false;
    }
}

function shiftWindowsDown(idx) {
    if (isDragging) return;

    const desktops = compat.workspaceDesktops();

    compat.windowList(workspace).forEach(c => {
        if (!c.desktops || !c.desktops.length) return;

        const updated = c.desktops.map(d => {
            const i = desktops.indexOf(d);
            return i > idx ? desktops[i - 1] : d;
        });

        compat.setClientDesktops(c, updated);
    });
}



function compactPreservingIndex() {
    if (animationGuard || isDragging) return;

    const desktops = compat.workspaceDesktops();
    const current = workspace.currentDesktop;
    if (!current) return;

    const oldIndex = desktops.indexOf(current);

    compactFromEnd();

    if (oldIndex === -1) return;

    const newDesktops = compat.workspaceDesktops();
    if (!newDesktops.length) return;

    const targetIndex = Math.min(oldIndex, newDesktops.length - 1);
    const target = newDesktops[targetIndex];

    if (!target || target === workspace.currentDesktop) return;

    animationGuard = true;
    try {
        workspace.currentDesktop = target;
    } finally {
        animationGuard = false;
    }
}


function handleClientDesktopChange(client) {
    if (!client.desktops || !client.desktops.length) return;

    const last = compat.lastDesktop();
    if (!last) return;

    const onLast = compat.clientOnDesktop(client, last);

    if (onLast) {
        if (isDragging) {
            // Queue for after drag ends
            pendingNewDesktop.add(client);
        } else {
            // Safe to add immediately
            if (!lastDesktopTrigger.get(client)) {
                compat.addDesktop();
            }
        }
        lastDesktopTrigger.set(client, true);
    } else {
        lastDesktopTrigger.set(client, false);
    }

    if (!isDragging) {
        compactPreservingIndex();
    }
}

function onClientAdded(client) {
    if (!client || client.skipPager) return;
    if (!client.desktops || !client.desktops.length) return;

    const last = compat.lastDesktop();
    if (last && compat.clientOnDesktop(client, last)) {
        if (isDragging) {
            pendingNewDesktop.add(client);
        } else {
            compat.addDesktop();
        }
    }

    compat.desktopChangedSignal(client).connect(() => {
        handleClientDesktopChange(client);
    });
}



(function setupInitialDesktops() {
    const ds = compat.workspaceDesktops();
    if (ds.length && ds[0]) workspace.currentDesktop = ds[0];

    if (compat.desktopAmount() < 1) {
        compat.addDesktop();
    }
})();



compat.windowList(workspace).forEach(onClientAdded);
compat.windowAddedSignal(workspace).connect(onClientAdded);

workspace.windowRemoved.connect(() => {
    if (!isDragging) compactPreservingIndex();
});
