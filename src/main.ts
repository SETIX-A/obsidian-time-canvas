import { Plugin, WorkspaceLeaf } from 'obsidian';
import { TimeCanvasSettings, DEFAULT_SETTINGS, TimeCanvasSettingTab } from './settings';
import { TimeCanvasDashboardView, VIEW_TYPE_TIME_CANVAS } from './view';

export default class TimeCanvasPlugin extends Plugin {
    settings!: TimeCanvasSettings;

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new TimeCanvasSettingTab(this.app, this));

        this.registerView(
            VIEW_TYPE_TIME_CANVAS,
            (leaf) => new TimeCanvasDashboardView(leaf, this)
        );

        this.addCommand({
            id: 'open-sidebar',
            name: 'Open sidebar',
            callback: () => {
                void this.activateView();
            }
        });

        this.addRibbonIcon('calendar-clock', 'Time canvas', () => {
            void this.activateView();
        });
    }

    async activateView() {
        const { workspace } = this.app;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_TIME_CANVAS);
        let leaf: WorkspaceLeaf;

        if (leaves.length > 0) {
            leaf = leaves[0] as WorkspaceLeaf;
        } else {
            const rightLeaf = workspace.getRightLeaf(false);
            if (!rightLeaf) return;
            await rightLeaf.setViewState({ type: VIEW_TYPE_TIME_CANVAS, active: true });
            leaf = rightLeaf;
        }

        void workspace.revealLeaf(leaf);
    }

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            (await this.loadData()) as Partial<TimeCanvasSettings>
        );
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}