import { ItemView, WorkspaceLeaf, moment, TFile, setIcon, normalizePath } from 'obsidian';
import TimeCanvasPlugin from './main';
import { t } from './settings';

export const VIEW_TYPE_TIME_CANVAS = "time-canvas-dashboard-view";

export class TimeCanvasDashboardView extends ItemView {
    plugin: TimeCanvasPlugin;
    private allExpanded = true;
    private renderToken = 0;
    private lastRenderedDateStr: string | null = null;
    private debounceTimer: number | null = null;
    private collapsedNotePaths: Set<string> = new Set();
    private collapsedYears: Set<number> = new Set();
    private savedScrollTop = 0;
    private lastActiveFilePath: string | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: TimeCanvasPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() { return VIEW_TYPE_TIME_CANVAS; }
    getDisplayText() { return "Time canvas"; }
    getIcon() { return "calendar-clock"; }

    async onOpen() {
        await this.renderDashboard();

        this.registerEvent(
            this.app.workspace.on('file-open', () => {
                if (!this.plugin.settings.followActiveNote) return;
                this.triggerRender(false); 
            })
        );

        this.registerEvent(
            this.app.metadataCache.on('changed', (file) => {
                if (this.checkRelevance(file)) this.triggerRender(true); 
            })
        );

        this.registerEvent(
            this.app.vault.on('rename', (file) => {
                if (file instanceof TFile && this.checkRelevance(file)) this.triggerRender(true);
            })
        );

        this.registerEvent(
            this.app.vault.on('delete', (file) => {
                if (file instanceof TFile && this.checkRelevance(file)) this.triggerRender(true);
            })
        );
    }

    /**
     * @description Prevent expensive re-renders by checking if the changed file is relevant to current view
     */
    private checkRelevance(file: TFile): boolean {
        if (!file) return false;
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile && file.path === activeFile.path) return true;

        const fileDateStr = this.getSmartDate(file).format('MM-DD');
        return this.lastRenderedDateStr === fileDateStr;
    }

    private triggerRender(force = false) {
        if (this.debounceTimer !== null) {
            window.clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = window.setTimeout(() => {
            this.debounceTimer = null;
            void this.renderDashboard(force);
        }, 500); 
    }

    async onClose() {
        if (this.debounceTimer !== null) {
            window.clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
    }

    getSmartDate(file: TFile): moment.Moment {
        try {
            const cache = this.app.metadataCache.getFileCache(file);
            const fm = cache?.frontmatter;

            const tryField = (fieldName: string): moment.Moment | null => {
                if (fm?.[fieldName]) {
                    const d = moment(String(fm[fieldName]));
                    if (d.isValid()) return d;
                }
                return null;
            };

            const priority = this.plugin.settings.datePriority;
            let date: moment.Moment | null = null;

            if (priority === 'created-first') {
                date = tryField('created') ?? tryField('date');
            } else if (priority === 'date-first') {
                date = tryField('date') ?? tryField('created');
            } else {
                const customField = this.plugin.settings.customDateField.trim();
                if (customField) date = tryField(customField);
            }

            if (date) return date;

            const match = file.name.match(/(\d{4}-\d{2}-\d{2})/);
            if (match) {
                const nameDate = moment(match[1]);
                if (nameDate.isValid()) return nameDate;
            }

            return moment(file.stat.ctime);
        } catch {
            return moment();
        }
    }

    async renderDashboard(forceRerender = false) {
        const activeFile = this.app.workspace.getActiveFile();
        const targetDate = this.plugin.settings.followActiveNote && activeFile
            ? this.getSmartDate(activeFile)
            : moment();
        const currentDateStr = targetDate.format('MM-DD');

        const activeFilePath = activeFile?.path ?? null;
        const activeFileChanged = activeFilePath !== this.lastActiveFilePath;

        if (!forceRerender && this.lastRenderedDateStr === currentDateStr && !activeFileChanged) return;
        this.lastRenderedDateStr = currentDateStr;
        this.lastActiveFilePath = activeFilePath;

        this.renderToken++;
        const capturedToken = this.renderToken;

        try {
            const container = this.contentEl;
            // Preserve UI state across re-renders
            const existingScroll = this.contentEl.querySelector('.tc-scrollable-container');
            this.savedScrollTop = existingScroll ? (existingScroll as HTMLElement).scrollTop : 0;
            this.collapsedNotePaths = new Set();
            this.collapsedYears = new Set();
            this.contentEl.querySelectorAll('.tc-note-card').forEach(card => {
                const cw = card.querySelector('.tc-content-wrapper');
                const link = card.querySelector('.tc-note-title');
                if (cw && !cw.hasClass('tc-visible') && link) {
                    const path = link.getAttribute('data-href');
                    if (path) this.collapsedNotePaths.add(path);
                }
            });
            this.contentEl.querySelectorAll('.hist-year-header').forEach(header => {
                if (header.getAttribute('data-expanded') === 'false') {
                    const yearLabel = header.querySelector('.tc-year-label');
                    if (yearLabel) {
                        const yearMatch = yearLabel.textContent?.match(/(\d{4})/);
                        if (yearMatch) this.collapsedYears.add(parseInt(yearMatch[1]!, 10));
                    }
                }
            });

            container.empty();
            container.addClasses(['tc-view-root']);

            const isZh = moment.locale().startsWith('zh');
            const hoverClass = this.plugin.settings.enableCardHover ? "tc-allow-hover" : "";

            // Parse exclude folders with path normalization
            const excludeFolders = this.plugin.settings.excludeFolders
                .split(',')
                .map(f => normalizePath(f.trim()))
                .filter(Boolean);

            // Parse display properties
            const displayProps = this.plugin.settings.displayProperties
                .split(',')
                .map(p => p.trim().toLowerCase())
                .filter(Boolean);

            const allFiles = this.app.vault.getMarkdownFiles();
            const historyMap = new Map<number, TFile[]>();
            
            for (const file of allFiles) {
                if (!this.plugin.settings.showCurrentNote && activeFile && file.path === activeFile.path) continue;
                if (excludeFolders.some(folder => file.path.startsWith(folder + '/') || file.path === folder)) continue;
                const fileDate = this.getSmartDate(file);
                if (
                    fileDate.month() === targetDate.month() &&
                    fileDate.date() === targetDate.date()
                ) {
                    const year = fileDate.year();
                    if (!historyMap.has(year)) historyMap.set(year, []);
                    historyMap.get(year)!.push(file);
                }
            }

            // Sort files within each year: active note first, rest by name
            for (const files of historyMap.values()) {
                files.sort((a, b) => {
                    if (activeFile) {
                        if (a.path === activeFile.path) return -1;
                        if (b.path === activeFile.path) return 1;
                    }
                    return a.basename.localeCompare(b.basename);
                });
            }

            const viewModeClass = this.plugin.settings.viewMode === 'outline' ? 'tc-view-outline' : 'tc-view-snippet';
            const wrapper = container.createDiv({ cls: `tc-dash-wrapper ${hoverClass} ${viewModeClass}` });
            const cssVars: Record<string, string> = {
                '--tc-heading-spacing': `${this.plugin.settings.headingSpacing}px`,
            };
            
            if (this.plugin.settings.colorTitle) cssVars['--tc-title-color'] = this.plugin.settings.colorTitle;
            if (this.plugin.settings.colorTags) cssVars['--tc-tags-color'] = this.plugin.settings.colorTags;
            if (this.plugin.settings.colorHeading) cssVars['--tc-heading-color'] = this.plugin.settings.colorHeading;
            if (this.plugin.settings.colorHeadingHover) cssVars['--tc-heading-hover-bg'] = this.plugin.settings.colorHeadingHover;
            if (this.plugin.settings.cardBgLight) cssVars['--tc-card-bg-light'] = this.plugin.settings.cardBgLight;
            if (this.plugin.settings.cardBgDark) cssVars['--tc-card-bg-dark'] = this.plugin.settings.cardBgDark;
            cssVars['--tc-fs-title'] = `${this.plugin.settings.fontSizeTitle}px`;
            cssVars['--tc-fs-year'] = `${this.plugin.settings.fontSizeYear}px`;
            cssVars['--tc-fs-note'] = `${this.plugin.settings.fontSizeNote}px`;
            cssVars['--tc-fs-heading'] = `${this.plugin.settings.fontSizeHeading}px`;
            cssVars['--tc-fs-snippet'] = `${this.plugin.settings.fontSizeSnippet}px`;
            cssVars['--tc-snippet-lines'] = String(this.plugin.settings.snippetLines);
            wrapper.setCssProps(cssVars);

            const stickyHeader = wrapper.createDiv({ cls: 'tc-sticky-header' });
            const headerFlex = stickyHeader.createDiv({ cls: 'tc-header-flex' });

            const dateLabel = isZh
                ? `${targetDate.format('MM月DD日')} 的画卷`
                : `On this day, ${targetDate.format('MMMM D')}`;
            headerFlex.createSpan({ cls: 'tc-header-title', text: dateLabel });

            const btnGroup = headerFlex.createDiv({ cls: 'tc-btn-group' });
            const btnToggleAll = btnGroup.createDiv({
                cls: 'tc-icon-btn tc-toggle-all',
                attr: {
                    title: 'Expand / collapse all',
                    'aria-label': 'Expand or collapse all'
                }
            });
            const btnViewMode = btnGroup.createDiv({
                cls: 'tc-icon-btn tc-view-mode',
                attr: {
                    title: this.plugin.settings.viewMode === 'outline' ? t('toggle_outline') : t('toggle_snippet'),
                    'aria-label': this.plugin.settings.viewMode === 'outline' ? t('toggle_outline') : t('toggle_snippet')
                }
            });

            const scrollableContainer = wrapper.createDiv({ cls: 'tc-scrollable-container' });
            const contentArea = scrollableContainer.createDiv({ cls: 'tc-content-area' });

            if (historyMap.size > 0) {
                const sortedYears = Array.from(historyMap.keys()).sort((a, b) => b - a);

                for (const year of sortedYears) {
                    const files = historyMap.get(year)!;
                    const isExpanded = !this.collapsedYears.has(year);
                    const yearGroup = contentArea.createDiv({ cls: 'hist-year-group' });

                    const yearHeader = yearGroup.createDiv({ cls: 'hist-year-header' });
                    yearHeader.setAttribute('data-expanded', isExpanded.toString());
                    yearHeader.createDiv({ cls: 'tc-year-icon' });

                    const delta = targetDate.year() - year;
                    let yearText = isZh ? `${year}年` : `${year}`;

                    if (this.plugin.settings.showYearsAgo && delta !== 0) {
                        const absDelta = Math.abs(delta);
                        if (delta > 0) {
                            yearText += isZh 
                                ? ` (${absDelta}年前)` 
                                : ` (${absDelta} ${absDelta === 1 ? 'yr' : 'yrs'} ago)`;
                        } else {
                            yearText += isZh 
                                ? ` (${absDelta}年后)` 
                                : ` (in ${absDelta} ${absDelta === 1 ? 'yr' : 'yrs'})`;
                        }
                    }

                    yearHeader.createSpan({ cls: 'tc-year-label', text: yearText });

                    const yearBody = yearGroup.createDiv({ cls: 'hist-year-body' });
                    yearBody.setCssProps({ '--tc-max-height': isExpanded ? 'none' : '0px' });
                    const cardList = yearBody.createDiv({ cls: 'tc-card-list' });

                    for (const file of files) {
                        const cache = this.app.metadataCache.getFileCache(file);
                        const fm = cache?.frontmatter ?? {};

                        const noteCard = cardList.createDiv({ cls: 'tc-note-card' });
                        const noteHeader = noteCard.createDiv({ cls: 'tc-note-header' });

                        const headings = cache?.headings?.filter(h => h.level <= this.plugin.settings.maxHeadingLevel) ?? [];

                        const toggleIcon = noteHeader.createDiv({ cls: 'tc-note-toggle' });
                        setIcon(toggleIcon, 'chevron-down');

                        const linkEl = noteHeader.createEl('a', {
                            cls: 'tc-link tc-note-title',
                            text: file.basename
                        });
                        linkEl.setAttribute('data-href', file.path);

                        // Render display properties
                        if (displayProps.length > 0) {
                            const propsRow = noteCard.createDiv({ cls: 'tc-props-row' });
                            let hasAnyProp = false;

                            for (const propName of displayProps) {
                                const rawVal: unknown = fm[propName];
                                if (rawVal === undefined || rawVal === null) continue;

                                if (propName === 'tags') {
                                    const tagsArr: string[] = Array.isArray(rawVal)
                                        ? rawVal.filter((x: unknown): x is string => typeof x === 'string')
                                        : typeof rawVal === 'string' ? [rawVal] : [];
                                    if (tagsArr.length > 0) {
                                        hasAnyProp = true;
                                        for (const tag of tagsArr) {
                                            propsRow.createSpan({
                                                cls: 'hist-tag',
                                                text: `#${tag.replace(/^#/, '')}`
                                            });
                                        }
                                    }
                                } else if (propName === 'title') {
                                    if (typeof rawVal === 'string' && rawVal) {
                                        hasAnyProp = true;
                                        propsRow.createSpan({ text: rawVal, cls: 'tc-fm-title' });
                                    }
                                } else {
                                    const displayVal = Array.isArray(rawVal)
                                        ? rawVal.join(', ')
                                        : typeof rawVal === 'string' || typeof rawVal === 'number' || typeof rawVal === 'boolean'
                                            ? String(rawVal)
                                            : '';
                                    if (displayVal) {
                                        hasAnyProp = true;
                                        const propEl = propsRow.createSpan({ cls: 'tc-fm-prop' });
                                        propEl.createSpan({ cls: 'tc-fm-prop-label', text: `${propName}: ` });
                                        propEl.createSpan({ cls: 'tc-fm-prop-value', text: displayVal });
                                    }
                                }
                            }

                            if (!hasAnyProp) propsRow.remove();
                        }

                        // Render content area (outline or snippet)
                        const contentWrapper = noteCard.createDiv({ cls: 'tc-content-wrapper tc-visible' });

                        // Outline content (always rendered, CSS controls visibility)
                        if (headings.length > 0) {
                            const outlineContent = contentWrapper.createDiv({ cls: 'tc-outline-content' });
                            const minLevel = Math.min(...headings.map(h => h.level));
                            for (const h of headings) {
                                const hLink = outlineContent.createEl('a', {
                                    cls: 'heading-link tc-link',
                                    text: h.heading
                                });
                                hLink.setAttribute('data-href', `${file.path}#${h.heading}`);
                                hLink.setCssProps({ '--tc-indent': `${(h.level - minLevel) * 14}px` });
                            }
                        }

                        // Snippet content (always rendered, CSS controls visibility)
                        const snippetContent = contentWrapper.createDiv({ cls: 'tc-snippet-content' });
                        const snippetBox = snippetContent.createDiv({ cls: 'tc-snippet' });
                        void this.app.vault.cachedRead(file).then(raw => {
                            if (this.renderToken !== capturedToken) return;
                            const cleanText = raw
                                .replace(/^---[\s\S]*?---\n/, '')
                                .replace(/[#*>`\-$|[\]]/g, '')
                                .replace(/\s+/g, ' ')
                                .trim();
                            if (cleanText) {
                                snippetBox.setText(cleanText);
                            } else {
                                snippetBox.addClass('tc-hidden');
                            }
                        }).catch(() => {
                            snippetBox.addClass('tc-hidden');
                        });
                    }
                }
            } else {
                const emptyState = contentArea.createDiv({ cls: 'tc-empty-state' });
                emptyState.createDiv({ text: t('empty_title') });
                emptyState.createDiv({ text: t('empty_subtitle') });
            }

            this.initIconsAndEvents(wrapper, btnToggleAll, btnViewMode);

            // Restore collapsed notes from previous render
            if (this.collapsedNotePaths.size > 0) {
                contentArea.querySelectorAll('.tc-note-card').forEach(card => {
                    const link = card.querySelector('.tc-note-title');
                    const path = link?.getAttribute('data-href');
                    if (path && this.collapsedNotePaths.has(path)) {
                        const cw = card.querySelector('.tc-content-wrapper');
                        if (cw) {
                            cw.removeClass('tc-visible');
                            const toggle = card.querySelector('.tc-note-toggle');
                            if (toggle) setIcon(toggle as HTMLElement, 'chevron-right');
                        }
                    }
                });
            }

            // Restore scroll position
            if (this.savedScrollTop > 0) {
                const scrollEl = wrapper.querySelector('.tc-scrollable-container');
                if (scrollEl) {
                    window.requestAnimationFrame(() => {
                        (scrollEl as HTMLElement).scrollTop = this.savedScrollTop;
                    });
                }
            }

        } catch (error) {
            console.error("[Time Canvas] renderDashboard failed:", error);
            const container = this.contentEl;
            container.empty();
            const errorState = container.createDiv({ cls: 'tc-empty-state' });
            errorState.createDiv({ text: "Time Canvas rendering interrupted." });
            errorState.addClass('tc-error-text');
        }
    }

    initIconsAndEvents(wrapper: HTMLElement, btnAll: HTMLElement, btnViewMode: HTMLElement) {
        setIcon(btnViewMode, this.plugin.settings.viewMode === 'outline' ? 'list' : 'align-left');
        setIcon(btnAll, this.allExpanded ? 'chevrons-down-up' : 'chevrons-up-down');

        wrapper.querySelectorAll('.tc-year-icon').forEach(el => {
            const isExp = el.parentElement?.getAttribute('data-expanded') === 'true';
            setIcon(el as HTMLElement, isExp ? 'chevron-down' : 'chevron-right');
        });

        this.registerDomEvent(btnViewMode, 'click', () => {
            // Find the note card closest to viewport top before switching
            const scrollContainer = wrapper.querySelector('.tc-scrollable-container');
            let anchorCard: HTMLElement | null = null;
            let anchorOffset = 0;
            if (scrollContainer) {
                const scrollTop = (scrollContainer as HTMLElement).scrollTop;
                const cards = Array.from(scrollContainer.querySelectorAll('.tc-note-card'));
                for (const card of cards) {
                    const cardTop = (card as HTMLElement).offsetTop - (scrollContainer as HTMLElement).offsetTop;
                    if (cardTop <= scrollTop + 50) {
                        anchorCard = card as HTMLElement;
                        anchorOffset = scrollTop - cardTop;
                    } else {
                        break;
                    }
                }
            }

            this.plugin.settings.viewMode = this.plugin.settings.viewMode === 'outline' ? 'snippet' : 'outline';
            void this.plugin.saveSettings();
            wrapper.toggleClass('tc-view-outline', this.plugin.settings.viewMode === 'outline');
            wrapper.toggleClass('tc-view-snippet', this.plugin.settings.viewMode === 'snippet');
            setIcon(btnViewMode, this.plugin.settings.viewMode === 'outline' ? 'list' : 'align-left');

            // Restore scroll position anchored to the same card
            if (anchorCard && scrollContainer) {
                window.requestAnimationFrame(() => {
                    const newCardTop = anchorCard.offsetTop - (scrollContainer as HTMLElement).offsetTop;
                    (scrollContainer as HTMLElement).scrollTop = newCardTop + anchorOffset;
                });
            }
        });

        this.registerDomEvent(btnAll, 'click', () => {
            this.allExpanded = !this.allExpanded;
            setIcon(btnAll, this.allExpanded ? 'chevrons-down-up' : 'chevrons-up-down');
            wrapper.querySelectorAll('.tc-note-card').forEach(card => {
                const cwEl = card.querySelector('.tc-content-wrapper');
                const toggleEl = card.querySelector('.tc-note-toggle');
                if (cwEl instanceof HTMLElement) {
                    if (this.allExpanded) {
                        cwEl.addClass('tc-visible');
                        if (toggleEl instanceof HTMLElement) setIcon(toggleEl, 'chevron-down');
                    } else {
                        cwEl.removeClass('tc-visible');
                        if (toggleEl instanceof HTMLElement) setIcon(toggleEl, 'chevron-right');
                    }
                }
            });

            // Also collapse/expand year groups if setting is enabled
            if (this.plugin.settings.collapseYears) {
                wrapper.querySelectorAll('.hist-year-header').forEach(header => {
                    const body = header.nextElementSibling as HTMLElement | null;
                    if (!body) return;
                    const iconBox = header.querySelector('.tc-year-icon');
                    if (this.allExpanded) {
                        body.setCssProps({ '--tc-max-height': `${body.scrollHeight}px` });
                        body.addEventListener('transitionend', () => {
                            if (body.style.getPropertyValue('--tc-max-height') !== '0px') {
                                body.setCssProps({ '--tc-max-height': 'none' });
                            }
                        }, { once: true });
                        header.setAttribute('data-expanded', 'true');
                        if (iconBox) setIcon(iconBox as HTMLElement, 'chevron-down');
                    } else {
                        body.setCssProps({ '--tc-max-height': `${body.scrollHeight}px` });
                        void body.offsetHeight;
                        body.setCssProps({ '--tc-max-height': '0px' });
                        header.setAttribute('data-expanded', 'false');
                        if (iconBox) setIcon(iconBox as HTMLElement, 'chevron-right');
                    }
                });
            }
        });

        this.registerDomEvent(wrapper, 'click', (e) => {
            const target = e.target as HTMLElement;

            const header = target.closest('.hist-year-header');
            if (header) {
                e.preventDefault();
                const body = header.nextElementSibling as HTMLElement | null;
                if (!body) return;

                const iconBox = header.querySelector('.tc-year-icon');
                const isExp = header.getAttribute('data-expanded') === 'true';

                if (isExp) {
                    body.setCssProps({ '--tc-max-height': `${body.scrollHeight}px` });
                    void body.offsetHeight;
                    body.setCssProps({ '--tc-max-height': '0px' });
                    header.setAttribute('data-expanded', 'false');
                    if (iconBox) setIcon(iconBox as HTMLElement, 'chevron-right');
                } else {
                    body.setCssProps({ '--tc-max-height': `${body.scrollHeight}px` });
                    body.addEventListener('transitionend', () => {
                        if (body.style.getPropertyValue('--tc-max-height') !== '0px') {
                            body.setCssProps({ '--tc-max-height': 'none' });
                        }
                    }, { once: true });
                    header.setAttribute('data-expanded', 'true');
                    if (iconBox) setIcon(iconBox as HTMLElement, 'chevron-down');
                }
                return;
            }

            const noteToggle = target.closest('.tc-note-toggle');
            if (noteToggle) {
                e.preventDefault();
                const card = noteToggle.closest('.tc-note-card');
                const contentWrapper = card?.querySelector('.tc-content-wrapper');
                if (contentWrapper) {
                    const isVisible = contentWrapper.hasClass('tc-visible');
                    if (isVisible) {
                        contentWrapper.removeClass('tc-visible');
                        setIcon(noteToggle as HTMLElement, 'chevron-right');
                    } else {
                        contentWrapper.addClass('tc-visible');
                        setIcon(noteToggle as HTMLElement, 'chevron-down');
                    }
                }
                return;
            }

            const link = target.closest('.tc-link');
            if (link) {
                e.preventDefault();
                const path = link.getAttribute('data-href');
                if (path) void this.app.workspace.openLinkText(path, "", false);
            }
        });
    }
}