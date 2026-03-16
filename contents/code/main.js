// Kyanite | Smart dynamic workspace management for Plasma 6

const MIN_DESKTOPS = 1;
const LOG_LEVEL = 2;

function log(...args) { print("[kyanite]", ...args); }
function debug(...args) { if (LOG_LEVEL <= 1) log(...args); }
function trace(...args) { if (LOG_LEVEL <= 0) log(...args); }


let guardDepth = 0;


let dragInProgress = false;


const wiredClientIds = new Set();

/******** Plasma 6 Compatibility Layer ********/

const compat = {
	addDesktop: () => {
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
		guardDepth++;
		try {
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
			guardDepth--;
		}
	},

	clientDesktops: c => c.desktops,
	setClientDesktops: (c, ds) => { c.desktops = ds; },
	clientOnDesktop: (c, d) => d && c.desktops.indexOf(d) !== -1,

	desktopAmount: () => workspace.desktops.length,
};


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

/******** Trailing Desktop Invariant ********/


function ensureTrailingEmpty() {
	if (guardDepth > 0) return;

	const desktops = compat.workspaceDesktops();
	if (!desktops.length) return;

	if (!desktopIsEmpty(desktops.length - 1)) {
		guardDepth++;
		try {
			compat.addDesktop();
		} finally {
			guardDepth--;
		}
	}
}


function compactFromEnd() {
	if (guardDepth > 0) return;

	guardDepth++;
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
		guardDepth--;
	}
}

function shiftWindowsDown(idx) {
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
	if (dragInProgress || guardDepth > 0) return;

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

	guardDepth++;
	try {
		workspace.currentDesktop = target;
	} finally {
		guardDepth--;
	}
}

function reconcile() {
	ensureTrailingEmpty();
	compactPreservingIndex();
}


function handleClientDesktopChange() {
	reconcile();
}

function onDragFinished() {
	dragInProgress = false;
	debug("drag finished, reconciling");

	reconcile();
}

function onClientAdded(client) {
	if (!client || client.skipPager) return;
	if (!client.desktops || !client.desktops.length) return;

	reconcile();

	const id = client.internalId;
	if (!id || wiredClientIds.has(id)) return;
	wiredClientIds.add(id);

	if (client.interactiveMoveResizeStarted) {
		client.interactiveMoveResizeStarted.connect(() => {
			dragInProgress = true;
		});
	}
	if (client.interactiveMoveResizeFinished) {
		client.interactiveMoveResizeFinished.connect(() => {
			onDragFinished();
		});
	}

	compat.desktopChangedSignal(client).connect(() => {
		handleClientDesktopChange();
	});

	if (client.windowClosed) {
		client.windowClosed.connect(() => {
			wiredClientIds.delete(id);
		});
	}
}

/******** Workspace-level drag signals ********/

if (workspace.windowStartUserMovedResized) {
	workspace.windowStartUserMovedResized.connect(_client => {
		dragInProgress = true;
		debug("drag started");
	});
}

if (workspace.windowFinishUserMovedResized) {
	workspace.windowFinishUserMovedResized.connect(_client => {
		onDragFinished();
	});
}

/******** Initialization ********/

(function setupInitialDesktops() {
	const ds = compat.workspaceDesktops();
	if (ds.length && ds[0]) workspace.currentDesktop = ds[0];

	if (compat.desktopAmount() < 1) {
		compat.addDesktop();
	}
})();

/******** Connect Signals ********/

compat.windowList(workspace).forEach(onClientAdded);
compat.windowAddedSignal(workspace).connect(onClientAdded);

workspace.windowRemoved.connect(() => {
	compactPreservingIndex();
});


workspace.currentDesktopChanged.connect(() => {
	reconcile();
});
