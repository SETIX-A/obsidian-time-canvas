import { App, FuzzySuggestModal, PluginSettingTab, Setting, moment, setIcon, normalizePath } from 'obsidian';
import TimeCanvasPlugin from './main';
import { TimeCanvasDashboardView, VIEW_TYPE_TIME_CANVAS } from './view';

export interface TimeCanvasSettings {
    followActiveNote: boolean;
    showCurrentNote: boolean;
    viewMode: 'outline' | 'snippet';
    collapseYears: boolean;
    displayProperties: string;
    excludeFolders: string;
    datePriority: 'created-first' | 'date-first' | 'custom';
    customDateField: string;
    snippetLines: number;
    enableCardHover: boolean;
    showYearsAgo: boolean;
    maxHeadingLevel: number;
    headingSpacing: number;
    fontSizeTitle: number;
    fontSizeYear: number;
    fontSizeNote: number;
    fontSizeHeading: number;
    fontSizeSnippet: number;
    colorTitle: string;
    colorTags: string;
    colorHeading: string;
    colorHeadingHover: string;
    cardBgLight: string;
    cardBgDark: string;
}

export const DEFAULT_SETTINGS: TimeCanvasSettings = {
    followActiveNote: true,
    showCurrentNote: true,
    viewMode: 'outline',
    collapseYears: false,
    displayProperties: 'title, tags',
    excludeFolders: '',
    datePriority: 'date-first',
    customDateField: '',
    snippetLines: 3,
    enableCardHover: false,
    showYearsAgo: true,
    maxHeadingLevel: 3,
    headingSpacing: 2,
    fontSizeTitle: 0,
    fontSizeYear: 0,
    fontSizeNote: 0,
    fontSizeHeading: 0,
    fontSizeSnippet: 0,
    colorTitle: '',
    colorTags: '',
    colorHeading: '',
    colorHeadingHover: '',
    cardBgLight: '',
    cardBgDark: ''
};

// Memory cache to prevent DOM thrashing when frequently reading CSS variables
const themeColorCache = new Map<string, string>();

/**
 * @description Extracts the computed hex color from a CSS variable.
 */
const getThemeColorHex = (cssVar: string, fallback: string): string => {
    const doc = typeof activeDocument !== 'undefined' ? activeDocument : document;
    if (!doc) return fallback;
    if (themeColorCache.has(cssVar)) return themeColorCache.get(cssVar)!;

    const div = doc.body.createDiv();
    div.style.backgroundColor = `var(${cssVar})`;
    const win = div.ownerDocument.defaultView ?? window;
    const rgb = win.getComputedStyle(div).backgroundColor;
    div.remove();
    
    let result = fallback;
    const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    
    if (match) {
        const r = parseInt(match[1]!, 10).toString(16).padStart(2, '0');
        const g = parseInt(match[2]!, 10).toString(16).padStart(2, '0');
        const b = parseInt(match[3]!, 10).toString(16).padStart(2, '0');
        let a = '';
        if (match[4] !== undefined) {
            a = Math.round(parseFloat(match[4]) * 255).toString(16).padStart(2, '0');
            if (a === 'ff') a = '';
        }
        result = `#${r}${g}${b}${a}`;
    }
    
    themeColorCache.set(cssVar, result);
    return result;
};

const TRANSLATIONS = {
    zh: {
        title: 'Time Canvas (时间画卷) 设置',
        core_header: '核心行为',
        follow_name: '启用日期跟随模式',
        follow_desc: '开启后，侧边栏将根据当前打开的笔记日期进行历史回溯。关闭则固定为今天。',
        show_current: '显示当前笔记',
        show_current_desc: '在历史面板中显示当前正在编辑的笔记。',
        date_source_header: '日期来源',
        date_priority: '用来识别"创建日期"的字段',
        date_priority_desc: '选择优先读取的 frontmatter 日期字段，找不到则依次降级，最终回退到文件系统创建时间。',
        date_opt_created_first: '优先 created 字段',
        date_opt_date_first: '优先 date 字段',
        date_opt_custom: '自定义字段',
        date_opt_created_first_explain: '先找 created → 再找 date → 最后用文件创建时间',
        date_opt_date_first_explain: '先找 date → 再找 created → 最后用文件创建时间',
        date_opt_custom_explain: '使用自定义字段名，找不到则用文件创建时间',
        custom_date_field: '自定义日期字段名',
        custom_date_field_desc: '输入 frontmatter 中用于存储日期的字段名，如 created_at。',
        content_header: '卡片内容',
        display_properties: '显示的笔记属性',
        display_properties_desc: '输入要在卡片上显示的 frontmatter 属性名，用逗号分隔。如：title, tags, author。留空则不显示任何属性。',
        max_heading_level: '显示大纲最大层级',
        max_heading_level_desc: '设置侧边栏卡片中最多显示到几级标题（如设置为 3，则显示 H1-H3）。',
        heading_spacing: '大纲条目间距',
        heading_spacing_desc: '调整大纲条目之间的垂直间距。',
        snippet_lines: '摘要行数',
        snippet_lines_desc: '摘要模式下显示的行数，超出部分在行末自然省略。',
        collapse_years: '折叠时同时折叠年份组',
        collapse_years_desc: '开启后，点击折叠按钮时会同时折叠所有年份组。关闭则只折叠笔记内容，年份组保持展开。',
        filter_header: '过滤',
        exclude_folders: '排除文件夹',
        exclude_folders_desc: '点击添加按钮选择要排除的文件夹，或手动输入路径后按回车添加。',
        years_ago: '显示时间跨度 (几年前)',
        years_ago_desc: '在年份旁边显示距离现在已经过去了多少年。',
        appearance_header: '外观与颜色',
        card_hover: '卡片悬停发光特效',
        card_hover_desc: '鼠标悬停在历史笔记卡片上时显示主题色边框高亮（默认关闭）。',
        card_bg_light: '浅色模式卡片背景',
        card_bg_light_desc: '自定义浅色模式下卡片的背景颜色。留空则使用默认色。',
        card_bg_dark: '深色模式卡片背景',
        card_bg_dark_desc: '自定义深色模式下卡片的背景颜色。留空则使用默认微透色。',
        color_title: 'Title 颜色',
        color_title_desc: '自定义文档属性 Title 的文字颜色。留空则使用主题默认。',
        color_tags: 'Tags 颜色',
        color_tags_desc: '自定义文档属性 Tags 的文字颜色。留空则使用主题默认。',
        color_heading: '正文大纲颜色',
        color_heading_desc: '自定义大纲层级标题的文字颜色。留空则使用主题默认。',
        color_heading_hover: '大纲悬停背景色',
        color_heading_hover_desc: '自定义大纲层级标题在鼠标悬停时的背景颜色。留空则使用主题默认色。',
        font_size_header: '字体大小',
        font_size_title: '画卷标题字号',
        font_size_title_desc: '相对主题默认的偏移量，0 = 跟随主题，负值缩小，正值放大。',
        font_size_year: '年份字号',
        font_size_year_desc: '相对主题默认的偏移量，0 = 跟随主题，负值缩小，正值放大。',
        font_size_note: '笔记名字号',
        font_size_note_desc: '相对主题默认的偏移量，0 = 跟随主题，负值缩小，正值放大。',
        font_size_heading: '大纲字号',
        font_size_heading_desc: '相对主题默认的偏移量，0 = 跟随主题，负值缩小，正值放大。',
        font_size_snippet: '摘要字号',
        font_size_snippet_desc: '相对主题默认的偏移量，0 = 跟随主题，负值缩小，正值放大。',
        font_size_default: '跟随主题',
        empty_title: '今天是一张纯白的画布',
        empty_subtitle: '正等待你落笔',
        toggle_outline: '大纲模式',
        toggle_snippet: '摘要模式',
    },
    en: {
        title: 'Time Canvas settings',
        core_header: 'Core behavior',
        follow_name: 'Follow active note date',
        follow_desc: 'If enabled, the sidebar will dynamically search history based on the active note\'s date.',
        show_current: 'Show active note',
        show_current_desc: 'Display the currently active note in the history dashboard.',
        date_source_header: 'Date source',
        date_priority: 'Date field priority',
        date_priority_desc: 'Choose which frontmatter field to read first. Falls back to file system creation time if none found.',
        date_opt_created_first: 'Created field first',
        date_opt_date_first: 'Date field first',
        date_opt_custom: 'Custom field',
        date_opt_created_first_explain: 'created → date → file creation time',
        date_opt_date_first_explain: 'date → created → file creation time',
        date_opt_custom_explain: 'Custom field name, fallback to file creation time',
        custom_date_field: 'Custom date field name',
        custom_date_field_desc: 'Enter the frontmatter field name for dates, e.g. created_at.',
        content_header: 'Card content',
        display_properties: 'Display properties',
        display_properties_desc: 'Enter frontmatter property names to display on cards, separated by commas. E.g.: title, tags, author. Leave empty to hide all.',
        max_heading_level: 'Max heading level',
        max_heading_level_desc: 'Set the maximum heading level to display on the cards (e.g., 3 means H1-H3).',
        heading_spacing: 'Heading spacing',
        heading_spacing_desc: 'Adjust the vertical gap between heading items.',
        snippet_lines: 'Snippet lines',
        snippet_lines_desc: 'Number of lines to display in snippet mode. Overflow is naturally ellipsed at line end.',
        collapse_years: 'Collapse year groups when folding',
        collapse_years_desc: 'When enabled, the fold button will also collapse all year groups. When disabled, only note content is folded while year groups stay expanded.',
        filter_header: 'Filtering',
        exclude_folders: 'Exclude folders',
        exclude_folders_desc: 'Click the add button to select folders to exclude, or type a path and press Enter to add.',
        years_ago: 'Show time span (years ago)',
        years_ago_desc: 'Display how many years have passed next to the year.',
        appearance_header: 'Appearance and colors',
        card_hover: 'Card hover glow effect',
        card_hover_desc: 'Highlight card borders with theme accent color on hover.',
        card_bg_light: 'Light mode card background',
        card_bg_light_desc: 'Custom background color for cards in light mode. Leave empty for default.',
        card_bg_dark: 'Dark mode card background',
        card_bg_dark_desc: 'Custom background color for cards in dark mode. Leave empty for default.',
        color_title: 'Title color',
        color_title_desc: 'Custom text color for the Title property. Leave empty for default.',
        color_tags: 'Tags color',
        color_tags_desc: 'Custom text color for the Tags property. Leave empty for default.',
        color_heading: 'Heading color',
        color_heading_desc: 'Custom text color for the note headings. Leave empty for default.',
        color_heading_hover: 'Heading hover background',
        color_heading_hover_desc: 'Custom background color when hovering over headings. Leave empty for default.',
        font_size_header: 'Font size',
        font_size_title: 'Dashboard title font size',
        font_size_title_desc: 'Offset from theme default. 0 = follow theme, negative = smaller, positive = larger.',
        font_size_year: 'Year label font size',
        font_size_year_desc: 'Offset from theme default. 0 = follow theme, negative = smaller, positive = larger.',
        font_size_note: 'Note name font size',
        font_size_note_desc: 'Offset from theme default. 0 = follow theme, negative = smaller, positive = larger.',
        font_size_heading: 'Heading font size',
        font_size_heading_desc: 'Offset from theme default. 0 = follow theme, negative = smaller, positive = larger.',
        font_size_snippet: 'Snippet font size',
        font_size_snippet_desc: 'Offset from theme default. 0 = follow theme, negative = smaller, positive = larger.',
        font_size_default: 'Follow theme',
        empty_title: 'A blank canvas today',
        empty_subtitle: 'Waiting for your first word',
        toggle_outline: 'Outline mode',
        toggle_snippet: 'Snippet mode',
    }
} as const;

export type TranslationKey = keyof typeof TRANSLATIONS['zh'];

export const t = (key: TranslationKey): string => {
    const lang = moment.locale().startsWith('zh') ? 'zh' : 'en';
    return TRANSLATIONS[lang][key];
};

export class TimeCanvasSettingTab extends PluginSettingTab {
    plugin: TimeCanvasPlugin;

    constructor(app: App, plugin: TimeCanvasPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    private refreshView() {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TIME_CANVAS);
        for (const leaf of leaves) {
            if (leaf.view instanceof TimeCanvasDashboardView) {
                void leaf.view.renderDashboard(true);
            }
        }
    }

    display(): void {
        themeColorCache.clear();
        const { containerEl } = this;
        // Preserve scroll position across re-renders
        const scrollTop = containerEl.closest('.modal-content')?.scrollTop
            ?? containerEl.closest('.vertical-tab-content')?.scrollTop
            ?? 0;

        containerEl.empty();

        new Setting(containerEl).setName(t('title')).setHeading();
        new Setting(containerEl).setName(t('core_header')).setHeading();

        new Setting(containerEl)
            .setName(t('follow_name'))
            .setDesc(t('follow_desc'))
            .addToggle(toggle =>
                toggle.setValue(this.plugin.settings.followActiveNote)
                    .onChange(async v => {
                        this.plugin.settings.followActiveNote = v;
                        await this.plugin.saveSettings();
                        this.refreshView();
                    })
            );

        new Setting(containerEl)
            .setName(t('show_current'))
            .setDesc(t('show_current_desc'))
            .addToggle(toggle =>
                toggle.setValue(this.plugin.settings.showCurrentNote)
                    .onChange(async v => {
                        this.plugin.settings.showCurrentNote = v;
                        await this.plugin.saveSettings();
                        this.refreshView();
                    })
            );

        new Setting(containerEl).setName(t('date_source_header')).setHeading();

        new Setting(containerEl)
            .setName(t('date_priority'))
            .setDesc(t('date_priority_desc'))
            .addDropdown(drop =>
                drop.addOption('created-first', t('date_opt_created_first'))
                    .addOption('date-first', t('date_opt_date_first'))
                    .addOption('custom', t('date_opt_custom'))
                    .setValue(this.plugin.settings.datePriority)
                    .onChange(async (v: string) => {
                        this.plugin.settings.datePriority = v as TimeCanvasSettings['datePriority'];
                        await this.plugin.saveSettings();
                        this.display();
                        this.refreshView();
                    })
            );

        if (this.plugin.settings.datePriority === 'created-first') {
            new Setting(containerEl).setDesc(t('date_opt_created_first_explain'));
        } else if (this.plugin.settings.datePriority === 'date-first') {
            new Setting(containerEl).setDesc(t('date_opt_date_first_explain'));
        } else {
            new Setting(containerEl)
                .setName(t('custom_date_field'))
                .setDesc(t('custom_date_field_desc'))
                .addText(text => text
                    .setValue(this.plugin.settings.customDateField)
                    .onChange(async (v) => {
                        this.plugin.settings.customDateField = v.trim();
                        await this.plugin.saveSettings();
                        this.refreshView();
                    })
                );
        }

        new Setting(containerEl).setName(t('content_header')).setHeading();

        new Setting(containerEl)
            .setName(t('display_properties'))
            .setDesc(t('display_properties_desc'))
            .addText(text => text
                .setValue(this.plugin.settings.displayProperties)
                .onChange(async (v) => {
                    this.plugin.settings.displayProperties = v;
                    await this.plugin.saveSettings();
                    this.refreshView();
                })
            );

        new Setting(containerEl)
            .setName(t('max_heading_level'))
            .setDesc(t('max_heading_level_desc'))
            .addDropdown(drop =>
                drop.addOption('1', 'H1')
                    .addOption('2', 'H1 - h2')
                    .addOption('3', 'H1 - h3')
                    .addOption('4', 'H1 - h4')
                    .addOption('5', 'H1 - h5')
                    .addOption('6', 'H1 - h6')
                    .setValue(String(this.plugin.settings.maxHeadingLevel))
                    .onChange(async (v: string) => {
                        this.plugin.settings.maxHeadingLevel = parseInt(v, 10);
                        await this.plugin.saveSettings();
                        this.refreshView();
                    })
            );

        new Setting(containerEl)
            .setName(t('heading_spacing'))
            .setDesc(t('heading_spacing_desc'))
            .addSlider(slider => slider
                .setLimits(0, 20, 1)
                .setValue(this.plugin.settings.headingSpacing)
                .setDynamicTooltip()
                .onChange(async (v) => {
                    this.plugin.settings.headingSpacing = v;
                    await this.plugin.saveSettings();
                    this.refreshView();
                })
            );

        new Setting(containerEl)
            .setName(t('snippet_lines'))
            .setDesc(t('snippet_lines_desc'))
            .addSlider(slider => slider
                .setLimits(1, 10, 1)
                .setValue(this.plugin.settings.snippetLines)
                .setDynamicTooltip()
                .onChange(async (v) => {
                    this.plugin.settings.snippetLines = v;
                    await this.plugin.saveSettings();
                    this.refreshView();
                })
            );

        new Setting(containerEl)
            .setName(t('collapse_years'))
            .setDesc(t('collapse_years_desc'))
            .addToggle(toggle =>
                toggle.setValue(this.plugin.settings.collapseYears)
                    .onChange(async v => {
                        this.plugin.settings.collapseYears = v;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName(t('years_ago'))
            .setDesc(t('years_ago_desc'))
            .addToggle(toggle =>
                toggle.setValue(this.plugin.settings.showYearsAgo)
                    .onChange(async v => {
                        this.plugin.settings.showYearsAgo = v;
                        await this.plugin.saveSettings();
                        this.refreshView();
                    })
            );

        new Setting(containerEl).setName(t('filter_header')).setHeading();

        new Setting(containerEl)
            .setName(t('exclude_folders'))
            .setDesc(t('exclude_folders_desc'))
            .addButton(btn => btn
                .setIcon('plus')
                .setTooltip('Add folder')
                .onClick(() => {
                    this.showFolderSuggestModal();
                })
            );

        // Render excluded folders list
        this.renderExcludedFoldersList(containerEl);

        new Setting(containerEl).setName(t('appearance_header')).setHeading();

        new Setting(containerEl)
            .setName(t('card_hover'))
            .setDesc(t('card_hover_desc'))
            .addToggle(toggle =>
                toggle.setValue(this.plugin.settings.enableCardHover)
                    .onChange(async v => {
                        this.plugin.settings.enableCardHover = v;
                        await this.plugin.saveSettings();
                        this.refreshView();
                    })
            );

        new Setting(containerEl)
            .setName(t('card_bg_light'))
            .setDesc(t('card_bg_light_desc'))
            .addColorPicker(col => col
                .setValue(this.plugin.settings.cardBgLight || getThemeColorHex('--background-secondary-alt', '#f2f3f5'))
                .onChange(async (value) => {
                    this.plugin.settings.cardBgLight = value;
                    await this.plugin.saveSettings();
                    this.refreshView();
                })
            )
            .addExtraButton(btn => btn
                .setIcon('reset')
                .setTooltip('Reset default')
                .onClick(async () => {
                    this.plugin.settings.cardBgLight = '';
                    await this.plugin.saveSettings();
                    this.display();
                    this.refreshView();
                })
            );

        new Setting(containerEl)
            .setName(t('card_bg_dark'))
            .setDesc(t('card_bg_dark_desc'))
            .addColorPicker(col => col
                .setValue(this.plugin.settings.cardBgDark || getThemeColorHex('--background-secondary-alt', '#1e1e1e'))
                .onChange(async (value) => {
                    this.plugin.settings.cardBgDark = value;
                    await this.plugin.saveSettings();
                    this.refreshView();
                })
            )
            .addExtraButton(btn => btn
                .setIcon('reset')
                .setTooltip('Reset default')
                .onClick(async () => {
                    this.plugin.settings.cardBgDark = '';
                    await this.plugin.saveSettings();
                    this.display();
                    this.refreshView();
                })
            );

        new Setting(containerEl)
            .setName(t('color_title'))
            .setDesc(t('color_title_desc'))
            .addColorPicker(col => col
                .setValue(this.plugin.settings.colorTitle || getThemeColorHex('--text-normal', '#a6a6a6'))
                .onChange(async (value) => {
                    this.plugin.settings.colorTitle = value;
                    await this.plugin.saveSettings();
                    this.refreshView();
                })
            )
            .addExtraButton(btn => btn
                .setIcon('reset')
                .setTooltip('Reset default')
                .onClick(async () => {
                    this.plugin.settings.colorTitle = '';
                    await this.plugin.saveSettings();
                    this.display();
                    this.refreshView();
                })
            );

        new Setting(containerEl)
            .setName(t('color_tags'))
            .setDesc(t('color_tags_desc'))
            .addColorPicker(col => col
                .setValue(this.plugin.settings.colorTags || getThemeColorHex('--text-faint', '#999999'))
                .onChange(async (value) => {
                    this.plugin.settings.colorTags = value;
                    await this.plugin.saveSettings();
                    this.refreshView();
                })
            )
            .addExtraButton(btn => btn
                .setIcon('reset')
                .setTooltip('Reset default')
                .onClick(async () => {
                    this.plugin.settings.colorTags = '';
                    await this.plugin.saveSettings();
                    this.display();
                    this.refreshView();
                })
            );

        new Setting(containerEl)
            .setName(t('color_heading'))
            .setDesc(t('color_heading_desc'))
            .addColorPicker(col => col
                .setValue(this.plugin.settings.colorHeading || getThemeColorHex('--text-muted', '#999999'))
                .onChange(async (value) => {
                    this.plugin.settings.colorHeading = value;
                    await this.plugin.saveSettings();
                    this.refreshView();
                })
            )
            .addExtraButton(btn => btn
                .setIcon('reset')
                .setTooltip('Reset default')
                .onClick(async () => {
                    this.plugin.settings.colorHeading = '';
                    await this.plugin.saveSettings();
                    this.display();
                    this.refreshView();
                })
            );

        new Setting(containerEl)
            .setName(t('color_heading_hover'))
            .setDesc(t('color_heading_hover_desc'))
            .addColorPicker(col => col
                .setValue(this.plugin.settings.colorHeadingHover || getThemeColorHex('--background-modifier-hover', '#e5e5e5'))
                .onChange(async (value) => {
                    this.plugin.settings.colorHeadingHover = value;
                    await this.plugin.saveSettings();
                    this.refreshView();
                })
            )
            .addExtraButton(btn => btn
                .setIcon('reset')
                .setTooltip('Reset default')
                .onClick(async () => {
                    this.plugin.settings.colorHeadingHover = '';
                    await this.plugin.saveSettings();
                    this.display();
                    this.refreshView();
                })
            );

        new Setting(containerEl).setName(t('font_size_header')).setHeading();

        new Setting(containerEl)
            .setName(t('font_size_title'))
            .setDesc(t('font_size_title_desc'))
            .addSlider(slider => slider
                .setLimits(-8, 8, 1)
                .setValue(this.plugin.settings.fontSizeTitle)
                .setDynamicTooltip()
                .onChange(async (v) => {
                    this.plugin.settings.fontSizeTitle = v;
                    await this.plugin.saveSettings();
                    this.refreshView();
                })
            )
            .addExtraButton(btn => btn
                .setIcon('reset')
                .setTooltip(t('font_size_default'))
                .onClick(async () => {
                    this.plugin.settings.fontSizeTitle = 0;
                    await this.plugin.saveSettings();
                    this.display();
                    this.refreshView();
                })
            );

        new Setting(containerEl)
            .setName(t('font_size_year'))
            .setDesc(t('font_size_year_desc'))
            .addSlider(slider => slider
                .setLimits(-8, 8, 1)
                .setValue(this.plugin.settings.fontSizeYear)
                .setDynamicTooltip()
                .onChange(async (v) => {
                    this.plugin.settings.fontSizeYear = v;
                    await this.plugin.saveSettings();
                    this.refreshView();
                })
            )
            .addExtraButton(btn => btn
                .setIcon('reset')
                .setTooltip(t('font_size_default'))
                .onClick(async () => {
                    this.plugin.settings.fontSizeYear = 0;
                    await this.plugin.saveSettings();
                    this.display();
                    this.refreshView();
                })
            );

        new Setting(containerEl)
            .setName(t('font_size_note'))
            .setDesc(t('font_size_note_desc'))
            .addSlider(slider => slider
                .setLimits(-8, 8, 1)
                .setValue(this.plugin.settings.fontSizeNote)
                .setDynamicTooltip()
                .onChange(async (v) => {
                    this.plugin.settings.fontSizeNote = v;
                    await this.plugin.saveSettings();
                    this.refreshView();
                })
            )
            .addExtraButton(btn => btn
                .setIcon('reset')
                .setTooltip(t('font_size_default'))
                .onClick(async () => {
                    this.plugin.settings.fontSizeNote = 0;
                    await this.plugin.saveSettings();
                    this.display();
                    this.refreshView();
                })
            );

        new Setting(containerEl)
            .setName(t('font_size_heading'))
            .setDesc(t('font_size_heading_desc'))
            .addSlider(slider => slider
                .setLimits(-8, 8, 1)
                .setValue(this.plugin.settings.fontSizeHeading)
                .setDynamicTooltip()
                .onChange(async (v) => {
                    this.plugin.settings.fontSizeHeading = v;
                    await this.plugin.saveSettings();
                    this.refreshView();
                })
            )
            .addExtraButton(btn => btn
                .setIcon('reset')
                .setTooltip(t('font_size_default'))
                .onClick(async () => {
                    this.plugin.settings.fontSizeHeading = 0;
                    await this.plugin.saveSettings();
                    this.display();
                    this.refreshView();
                })
            );

        new Setting(containerEl)
            .setName(t('font_size_snippet'))
            .setDesc(t('font_size_snippet_desc'))
            .addSlider(slider => slider
                .setLimits(-8, 8, 1)
                .setValue(this.plugin.settings.fontSizeSnippet)
                .setDynamicTooltip()
                .onChange(async (v) => {
                    this.plugin.settings.fontSizeSnippet = v;
                    await this.plugin.saveSettings();
                    this.refreshView();
                })
            )
            .addExtraButton(btn => btn
                .setIcon('reset')
                .setTooltip(t('font_size_default'))
                .onClick(async () => {
                    this.plugin.settings.fontSizeSnippet = 0;
                    await this.plugin.saveSettings();
                    this.display();
                    this.refreshView();
                })
            );

        // Restore scroll position
        if (scrollTop > 0) {
            const scrollContainer = containerEl.closest('.modal-content')
                ?? containerEl.closest('.vertical-tab-content');
            if (scrollContainer) {
                window.requestAnimationFrame(() => {
                    (scrollContainer as HTMLElement).scrollTop = scrollTop;
                });
            }
        }
    }

    private getExcludedFolders(): string[] {
        return this.plugin.settings.excludeFolders
            .split(',')
            .map(f => normalizePath(f.trim()))
            .filter(Boolean);
    }

    private renderExcludedFoldersList(containerEl: HTMLElement) {
        // Remove existing list if any
        containerEl.querySelectorAll('.tc-exclude-list').forEach(el => el.remove());

        const folders = this.getExcludedFolders();
        if (folders.length === 0) return;

        const listEl = containerEl.createDiv({ cls: 'tc-exclude-list' });

        for (const folder of folders) {
            const item = listEl.createDiv({ cls: 'tc-exclude-item' });
            item.createSpan({ text: folder, cls: 'tc-exclude-item-path' });
            item.createDiv({ cls: 'tc-exclude-item-remove', attr: { 'aria-label': 'Remove' } }, el => {
                setIcon(el, 'x');
                this.plugin.registerDomEvent(el as HTMLElement, 'click', () => {
                    const current = this.getExcludedFolders();
                    const updated = current.filter(f => f !== folder);
                    this.plugin.settings.excludeFolders = updated.join(', ');
                    void this.plugin.saveSettings().then(() => {
                        this.display();
                        this.refreshView();
                    });
                });
            });
        }
    }

    private showFolderSuggestModal() {
        const existing = new Set(this.getExcludedFolders());
        const folders = this.app.vault.getAllFolders()
            .map(f => normalizePath(f.path))
            .filter(p => p !== '/' && p !== '')
            .sort();

        class FolderSuggestModal extends FuzzySuggestModal<string> {
            parent: TimeCanvasSettingTab;
            filteredFolders: string[];

            constructor(parent: TimeCanvasSettingTab, filteredFolders: string[]) {
                super(parent.app);
                this.parent = parent;
                this.filteredFolders = filteredFolders;
                this.setPlaceholder('Search folders...');
            }

            getItems(): string[] {
                return this.filteredFolders;
            }

            getItemText(item: string): string {
                return item;
            }

            onChooseItem(item: string, _evt: MouseEvent | KeyboardEvent): void {
                const normalizedItem = normalizePath(item);
                const current = this.parent.getExcludedFolders();
                if (!current.includes(normalizedItem)) {
                    current.push(normalizedItem);
                    this.parent.plugin.settings.excludeFolders = current.join(', ');
                    void this.parent.plugin.saveSettings().then(() => {
                        this.parent.display();
                        this.parent.refreshView();
                    });
                }
            }
        }

        const filtered = folders.filter(f => !existing.has(f));
        new FolderSuggestModal(this, filtered).open();
    }
}