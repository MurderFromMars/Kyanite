// Better Dynamic Workspaces

const MIN_DESKTOPS = 2;
const LOG_LEVEL = 2; // 0 verbose, 1 debug, 2 normal

function log(...args) { print("[better_dynamic_ws]", ...args); }
function debug(...args) { if (LOG_LEVEL <= 1) log(...args); }
function trace(...args) { if (LOG_LEVEL <= 0) log(...args); }

let animationGuard = false;

/******** Plasma‑6 Compatibility Layer ********/

const compat = {
	addDesktop: () => {
		workspace.createDesktop(workspace.desktops.length, undefined);
	},

	windowAddedSignal: ws => ws.windowAdded,
	windowList: ws => ws.windowList(),

	desktopChangedSignal: client => client.desktopsChanged,

	toDesktop: d => d,

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

	findDesktop: (list, d) => list.indexOf(d),

	clientDesktops: c => c.desktops,

	setClientDesktops: (c, ds) => { c.desktops = ds; },

	clientOnDesktop: (c, d) => c.desktops.indexOf(d) !== -1,

	desktopAmount: () => workspace.desktops.length,
};

/******** Desktop Renumbering (Correctly Handles Desktop 0) ********/

function renumberDesktops() {
	let count = compat.desktopAmount();

	for (let i = 0; i < count; i++) {
		const desktops = compat.workspaceDesktops();
		const current = desktops[i];

		if (desktops.indexOf(current) !== i) {
			compat.addDesktop();
			const newDesk = compat.lastDesktop();

			compat.windowList(workspace).forEach(client => {
				if (compat.clientOnDesktop(client, current)) {
					const newList = compat.clientDesktops(client)
					.map(d => (d === current ? newDesk : d));
					compat.setClientDesktops(client, newList);
				}
			});

			compat.deleteLastDesktop();
		}
	}
}

/******** Core Behavior ********/

function shiftClientsLeft(client, cutoff) {
	trace(`shiftClientsLeft(${client.caption}, ${cutoff})`);
	if (cutoff === 0) return;

	const all = compat.workspaceDesktops();
	const cds = compat.clientDesktops(client);
	const updated = [];

	let i = 0;
	for (const d of cds) {
		while (d !== all[i]) {
			i++;
			if (i > all.length)
				throw new Error("Unexpected desktop identity mismatch");
		}

		if (i < cutoff || i === 0) {
			updated.push(d);
		} else {
			updated.push(all[i - 1]);
		}
	}

	compat.setClientDesktops(client, updated);
}

function removeDesktop(idx) {
	trace(`removeDesktop(${idx})`);

	const count = compat.desktopAmount();
	if (count - 1 <= idx) {
		debug("Skipping removal: last desktop");
		return false;
	}
	if (count <= MIN_DESKTOPS) {
		debug("Skipping removal: minimum reached");
		return false;
	}

	compat.windowList(workspace).forEach(c => shiftClientsLeft(c, idx));

	compat.deleteLastDesktop();
	debug("Desktop removed");

	renumberDesktops();
	return true;
}

function desktopIsEmpty(idx) {
	trace(`desktopIsEmpty(${idx})`);

	const d = compat.workspaceDesktops()[idx];
	const clients = compat.windowList(workspace);

	for (const c of clients) {
		if (
			compat.clientOnDesktop(c, d) &&
			!c.skipPager &&
			!c.onAllDesktops
		) {
			debug(`Desktop ${idx} occupied by ${c.caption}`);
			return false;
		}
	}

	return true;
}

function handleClientDesktopChange(client) {
	trace(`handleClientDesktopChange(${client.caption})`);

	const last = compat.lastDesktop();
	if (compat.clientOnDesktop(client, last)) {
		compat.addDesktop();
		renumberDesktops();
	}
}

function onClientAdded(client) {
	if (!client) {
		log("onClientAdded(null) — rare but possible");
		return;
	}

	trace(`onClientAdded(${client.caption})`);

	if (client.skipPager) {
		debug("Ignoring hidden/pager‑skipped window");
		return;
	}

	if (compat.clientOnDesktop(client, compat.lastDesktop())) {
		compat.addDesktop();
		renumberDesktops();
	}

	compat.desktopChangedSignal(client).connect(() => {
		handleClientDesktopChange(client);
	});
}

function onDesktopSwitch(previous) {
	trace(`onDesktopSwitch(${previous})`);

	if (animationGuard) return;

	const all = compat.workspaceDesktops();
	const prevIdx = compat.findDesktop(all, compat.toDesktop(previous));
	const currIdx = compat.findDesktop(all, compat.toDesktop(workspace.currentDesktop));
	const keepMiddle = readConfig("keepEmptyMiddleDesktops", false);

	if (prevIdx <= currIdx) {
		debug("Moved rightward — no cleanup");
		return;
	}

	for (let i = compat.desktopAmount() - 2; i > currIdx && i > 0; i--) {
		debug(`Checking desktop ${i}`);
		if (desktopIsEmpty(i)) {
			removeDesktop(i);
		} else if (keepMiddle) {
			debug("Stopping cleanup — encountered non‑empty desktop");
			break;
		}
	}

	renumberDesktops();
}

/******** Initialization ********/

function trimToMinimum() {
	while (compat.desktopAmount() > MIN_DESKTOPS) {
		try {
			compat.deleteLastDesktop();
		} catch (err) {
			debug("Error trimming desktops:", err);
			break;
		}
	}
}

trimToMinimum();

(function setupInitialDesktops() {
	const ds = compat.workspaceDesktops();
	workspace.currentDesktop = ds[0];

	while (compat.desktopAmount() > MIN_DESKTOPS) {
		try {
			compat.deleteLastDesktop();
		} catch (err) {
			debug("Init cleanup failed:", err);
			break;
		}
	}

	if (compat.desktopAmount() < MIN_DESKTOPS) {
		compat.addDesktop();
	}

	renumberDesktops();
})();

compat.windowList(workspace).forEach(onClientAdded);
compat.windowAddedSignal(workspace).connect(onClientAdded);

workspace.currentDesktopChanged.connect(onDesktopSwitch);

/******** Force Login to Always Start on Desktop 1 ********/

callLater(() => {
	const ds = compat.workspaceDesktops();
	workspace.currentDesktop = ds[0];
});
