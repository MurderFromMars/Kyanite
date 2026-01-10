//Kyanite - Dynamic Workspace Management for Plasma 6
//Copyright (C) 2026 MurderFromMars

//This program is free software: you can redistribute it and/or modify
//it under the terms of the GNU General Public License version 3 as
//published by the Free Software Foundation.

//This program is distributed in the hope that it will be useful,
//but WITHOUT ANY WARRANTY; without even the implied warranty of
//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
//GNU General Public License for more details.
//You should have received a copy of the GNU General Public License
//along with this program. If not, see <https://www.gnu.org/licenses/>.


const MIN_DESKTOPS = 1;
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

	lastDesktop: () => {
		const ds = workspace.desktops;
		return ds.length ? ds[ds.length - 1] : null;
	},

	deleteLastDesktop: () => {
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

			if (current) workspace.currentDesktop = current;

		} finally {
			animationGuard = false;
		}
	},

	clientDesktops: c => c.desktops,
	setClientDesktops: (c, ds) => { c.desktops = ds; },
	clientOnDesktop: (c, d) => d && c.desktops.indexOf(d) !== -1,

	desktopAmount: () => workspace.desktops.length,
};

/******** Desktop State Helpers ********/

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

/******** Compaction ********/

function compactFromEnd() {
	if (animationGuard) return;

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
		if (!c.desktops || !c.desktops.length) return;

		const updated = c.desktops.map(d => {
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
		if (target) workspace.currentDesktop = target;
	} finally {
		animationGuard = false;
	}
}

/******** Core Behavior ********/

function handleClientDesktopChange(client) {
	if (!client.desktops || !client.desktops.length) return;

	const last = compat.lastDesktop();
	if (!last) return;

	if (compat.clientOnDesktop(client, last)) {
		compat.addDesktop();
	}

	compactPreservingIndex();
}

function onClientAdded(client) {
	if (!client || client.skipPager) return;
	if (!client.desktops || !client.desktops.length) return;

	const last = compat.lastDesktop();
	if (last && compat.clientOnDesktop(client, last)) {
		compat.addDesktop();
	}

	compat.desktopChangedSignal(client).connect(() => {
		handleClientDesktopChange(client);
	});

	compactPreservingIndex();
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
	compactPreservingIndex();
});
