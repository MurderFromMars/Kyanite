// Kyanite – Dynamic Workspaces for Plasma 6

const MIN_DESKTOPS = 1;   // ← NEW: allow Plasma to start with exactly 1 desktop
const LOG_LEVEL = 2;

function log(...args) { print("[kyanite]", ...args); }
function debug(...args) { if (LOG_LEVEL <= 1) log(...args); }
function trace(...args) { if (LOG_LEVEL <= 0) log(...args); }

let animationGuard = false;

/******** Plasma 6 Compatibility Layer ********/

const compat = {
	addDesktop: () => {
		workspace.createDesktop(workspace.desktops.length, undefined);
	},

	windowAddedSignal: ws => ws.windowAdded,
	windowList: ws => ws.windowList(),

	desktopChangedSignal: client => client.desktopsChanged,

	workspaceDesktops: () => workspace.desktops,

	lastDesktop: () => workspace.desktops[workspace.desktops.length - 1],

	deleteLastDesktop: () => {
		try {
			animationGuard = true;

			const desktops = workspace.desktops;
			const last = desktops[desktops.length - 1];
			const current = workspace.currentDesktop;
			const idx = desktops.indexOf(current);

			const fallback =
			idx + 1 < desktops.length || idx === -1
			? desktops[idx + 1]
			: current;

			workspace.currentDesktop = fallback;
			workspace.removeDesktop(last);
			workspace.currentDesktop = current;
		} finally {
			animationGuard = false;
		}
	},

	clientDesktops: c => c.desktops,
	setClientDesktops: (c, ds) => { c.desktops = ds; },
	clientOnDesktop: (c, d) => c.desktops.indexOf(d) !== -1,

	desktopAmount: () => workspace.desktops.length,
};

/******** Desktop State Helpers ********/

function desktopIsEmpty(idx) {
	const d = compat.workspaceDesktops()[idx];
	const clients = compat.windowList(workspace);

	for (const c of clients) {
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

/******** Compaction ********/

function compactFromEnd() {
	if (animationGuard) return;

	animationGuard = true;
	try {
		const desktops = compat.workspaceDesktops();
		const lastIdx = desktops.length - 1;

		// Remove empty desktops except the last one
		for (let i = lastIdx - 1; i >= 0; i--) {
			if (compat.desktopAmount() <= MIN_DESKTOPS) break;

			if (desktopIsEmpty(i)) {
				shiftWindowsDown(i);
				compat.deleteLastDesktop();
			}
		}

		// Ensure last desktop is empty — but only if we have >1 desktops
		const count = compat.desktopAmount();
		if (count > 1) {
			const newLastIdx = count - 1;
			if (!desktopIsEmpty(newLastIdx)) {
				compat.addDesktop();
			}
		}

	} finally {
		animationGuard = false;
	}
}

function shiftWindowsDown(idx) {
	const desktops = compat.workspaceDesktops();

	compat.windowList(workspace).forEach(c => {
		const cds = compat.clientDesktops(c);
		const updated = cds.map(d => {
			const i = desktops.indexOf(d);
			return i > idx ? desktops[i - 1] : d;
		});
		compat.setClientDesktops(c, updated);
	});
}

/******** Index‑Preserving Wrapper ********/

function compactPreservingIndex() {
	if (animationGuard) return;

	const desktops = compat.workspaceDesktops();
	const current = workspace.currentDesktop;
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

/******** Core Behavior ********/

function handleClientDesktopChange(client) {
	// If a client moves to the last desktop, create a new one
	if (compat.clientOnDesktop(client, compat.lastDesktop())) {
		compat.addDesktop();
	}

	compactPreservingIndex();
}

function onClientAdded(client) {
	if (!client || client.skipPager) return;

	// If the first window appears on the only desktop → create the empty one
	if (compat.clientOnDesktop(client, compat.lastDesktop())) {
		compat.addDesktop();
	}

	compat.desktopChangedSignal(client).connect(() => {
		handleClientDesktopChange(client);
	});

	compactPreservingIndex();
}

/******** Initialization ********/

// NEW: Start with exactly 1 desktop, no forced creation
(function setupInitialDesktops() {
	const ds = compat.workspaceDesktops();
	workspace.currentDesktop = ds[0];

	// If Plasma somehow starts with 0 desktops (rare), fix it
	if (compat.desktopAmount() < 1) {
		compat.addDesktop();
	}
})();

/******** Connect Signals ********/

compat.windowList(workspace).forEach(onClientAdded);
compat.windowAddedSignal(workspace).connect(onClientAdded);

// Compaction on window close
workspace.windowRemoved.connect(() => {
	compactPreservingIndex();
});

// Compaction on workspace switch
workspace.currentDesktopChanged.connect(() => {
	compactPreservingIndex();
});
