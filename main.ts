import {
    App, Events, ItemView, Menu, Notice, Plugin, PluginManifest, PluginSettingTab, Setting, TFile,
    WorkspaceLeaf
} from 'obsidian';

const PAGE_STATS_VIEW: string = "page-stats-view";
const ALL_VIEW: string = "all-view";

interface PageStatsSettings {
	order: string; // 0: Level 2: bold, level 3: highlighted
}

const DEFAULT_SETTINGS: PageStatsSettings = {
	order: "default",
};

type PageStats = {
	num_words: number;
	num_words_cite: number;
	num_words_note: number;
	num_words_bold: number;
	num_words_highlighted: number;
	num_blocks_cite: number;
	num_blocks_bold: number;
	num_blocks_hightlighted: number;
	num_comments: number;
};

export function createPageStats(): PageStats {
	return {
		num_words: 0,
		num_words_cite: 0,
		num_words_note: 0,
		num_words_bold: 0,
		num_words_highlighted: 0,
		num_blocks_cite: 0,
		num_blocks_bold: 0,
		num_blocks_hightlighted: 0,
		num_comments: 0,
	};
}

export default class PageStatsPlugin extends Plugin {
	settings: PageStatsSettings;
	eventEmitter: Events;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
	}

	onload(): void {
		this.eventEmitter = new Events();

		this.loadSettings();

		this.registerView(
			PAGE_STATS_VIEW,
			(leaf) => new PageStatsView(leaf, this)
		);

		this.addCommand({
			id: ALL_VIEW,
			name: "Enable plugin",
			callback: () => {
				this.onloadPageStatsView();
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new PageStatsSettingTab(this.app, this));
	}

	async onloadPageStatsView(): Promise<void> {
		if (this.app.workspace.getLeavesOfType(PAGE_STATS_VIEW).length == 0) {
			const right_leaf = this.app.workspace.getRightLeaf(false);
			if (right_leaf) {
				await right_leaf.setViewState({
					type: PAGE_STATS_VIEW,
					active: true,
				});
			}
		}
	}

	onunload(): void {
		// console.log('unload page-stats plugin'); // disable plugin
	}

	async loadSettings() {
		console.log("Loading Settings of PageStatsPlugin");
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		console.log("Saving Settings of PageStatsPlugin");
		await this.saveData(this.settings);
		this.eventEmitter.trigger("settings-change");
		//this.app.workspace.trigger('settings-changed');
	}
}

class PageStatsSettingTab extends PluginSettingTab {
	plugin: PageStatsPlugin;

	constructor(app: App, plugin: PageStatsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Summarization Level Methods")
			.setDesc(
				"Define which method is used in which layer of the pregressive summarization."
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOption(
						"default",
						"Level 2: bold - Level 3: highlighted (default)"
					)
					.addOption(
						"reverse",
						"Level 2: highlighted - Level 3: bold"
					)
					.setValue(this.plugin.settings.order)
					.onChange(async (value) => {
						this.plugin.settings.order = value;
						await this.plugin.saveSettings();
					});
			});
	}
}

class PageStatsView extends ItemView {
	m_plugin: PageStatsPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: PageStatsPlugin) {
		super(leaf);

		console.log("Creating PageStatsView");

		this.m_plugin = plugin;
	}

	getViewType(): string {
		return PAGE_STATS_VIEW;
	}

	getDisplayText(): string {
		return "Page Stats";
	}

	async onOpen(): Promise<void> {
		console.log("Opening Page Stats View");

		this.icon = "file-pie-chart";

		renderView(
			await this.getPageStats(),
			this.m_plugin.settings,
			this.containerEl
		);

		this.registerEvent(
			this.app.workspace.on("file-open", async () => {
				renderView(
					await this.getPageStats(),
					this.m_plugin.settings,
					this.containerEl
				);
			})
		);

		this.registerEvent(
			this.app.workspace.on("layout-change", async () => {
				console.log("layout-change triggered");
				renderView(
					await this.getPageStats(),
					this.m_plugin.settings,
					this.containerEl
				);
			})
		);

		this.registerEvent(
			this.m_plugin.eventEmitter.on("settings-change", async () => {
				console.log("settings-change triggered");
				renderView(
					await this.getPageStats(),
					this.m_plugin.settings,
					this.containerEl
				);
			})
		);
	}

	getWords(content: string): Array<string> {
		const obsidianWordRx =
			/(?:[0-9]+(?:(?:,|\.)[0-9]+)*|[\-'’A-Za-z\u00AA\u00B5\u00BA\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B4\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16F1-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2183\u2184\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005\u3006\u3031-\u3035\u303B\u303C\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6E5\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AD\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABE2\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC஀-௿가-힣ꥠ-ꥼힰ-ퟆ])+|[\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u4E00-\u9FD5\uAC00-\uD7A3\uA960-\uA97C\uD7B0-\uD7C6]/g;

		return content.match(obsidianWordRx) || [];
	}

	getCiteBlocks(content: string): Array<string> {
		const regex = /((?:^>.*$\n?)+)/gm;
		return content.match(regex) || [];
	}

	getBoldBlocks(content: string): Array<string> {
		const regex = /\*\*(.*?)\*\*/gm;
		return content.match(regex) || [];
	}

	getHighlightedBlocks(content: string): Array<string> {
		const regex = /==(.*?)==/gm;
		return content.match(regex) || [];
	}

	getComments(content: string): Array<string> {
		//console.log(content)
		const metadataRx = /^---\n([\s\S]*?)\n---\n/gm;
		const match = content.match(metadataRx);

		//console.log(match)

		let contentTransformed = content;
		if (match) {
			contentTransformed = content.slice(match[0].length);
		}

		//console.log(contentTransformed);

		const regex = /((?:^[A-Za-z0-9].*$\n?)+)/gm;
		return contentTransformed.match(regex) || [];
	}

	async getPageStats(): Promise<PageStats> {
		const pageStats = createPageStats();
		const activeFile: TFile | null = this.app.workspace.getActiveFile();

		if (activeFile == null) {
			return pageStats;
		}

		console.log("Loading File Content");
		// this.app.vault.read(activeFile).then((e) => {
		// 	console.log(
		// 		"Number of Highlights: " + this.getCiteBlocks(e).length
		// 	);
		// 	console.log(
		// 		"Number of Bold Texts: " + this.getBoldBlocks(e).length
		// 	);
		// 	console.log(
		// 		"Number of Highlighted Texts: " +
		// 			this.getHighlightedBlocks(e).length
		// 	);
		// 	console.log(
		// 		"Number of Words: " +
		// 			this.getWords(this.getCiteBlocks(e).join(" ")).length
		// 	);
		// 	console.log(
		// 		"Number of Bold Words: " +
		// 			this.getWords(this.getBoldBlocks(e).join(" ")).length
		// 	);
		// 	console.log(
		// 		"Number of Highlighted Words: " +
		// 			this.getWords(this.getHighlightedBlocks(e).join(" ")).length
		// 	);
		// });

		const content = await this.app.vault.read(activeFile);

		const blocks_cite = this.getCiteBlocks(content);
		pageStats.num_blocks_cite = blocks_cite.length;
		pageStats.num_words_cite = this.getWords(
			this.getCiteBlocks(content).join(" ")
		).length;
		pageStats.num_words_bold = this.getWords(
			this.getBoldBlocks(blocks_cite.join(" ")).join(" ")
		).length;
		pageStats.num_words_highlighted = this.getWords(
			this.getHighlightedBlocks(blocks_cite.join(" ")).join(" ")
		).length;
		pageStats.num_comments = this.getComments(content).length;

		return pageStats;
	}

	async onClose(): Promise<void> {
		// console.log('close local-tag view');
	}
}

function renderSumIcon(node: Element): Element {
	const iconSvg = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"svg"
	);
	const iconPath = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"path"
	);

	//<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sigma"><path d="M18 7V4H6l6 8-6 8h12v-3"/></svg>
	iconSvg.setAttribute("fill", "none");
	iconSvg.setAttribute("width", "24");
	iconSvg.setAttribute("height", "24");
	iconSvg.setAttribute("viewBox", "0 0 24 24");
	iconSvg.setAttribute("stroke", "currentColor");
	iconSvg.classList.add("svg-icon");

	iconPath.setAttribute("d", "M18 7V4H6l6 8-6 8h12v-3");
	iconPath.setAttribute("stroke-linecap", "round");
	iconPath.setAttribute("stroke-linejoin", "round");
	iconPath.setAttribute("stroke-width", "2");

	iconSvg.appendChild(iconPath);

	return node.appendChild(iconSvg);
}

function renderPercentIcon(node: Element): Element {
	const iconSvg = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"svg"
	);
	iconSvg.setAttribute("fill", "none");
	iconSvg.setAttribute("width", "24");
	iconSvg.setAttribute("height", "24");
	iconSvg.setAttribute("viewBox", "0 0 24 24");
	iconSvg.setAttribute("stroke", "currentColor");
	iconSvg.setAttribute("stroke-linecap", "round");
	iconSvg.setAttribute("stroke-linejoin", "round");
	iconSvg.setAttribute("stroke-width", "2");
	iconSvg.classList.add("svg-icon");

	const iconLine = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"line"
	);
	iconLine.setAttribute("x1", "19");
	iconLine.setAttribute("x2", "5");
	iconLine.setAttribute("y1", "5");
	iconLine.setAttribute("y2", "19");
	iconSvg.appendChild(iconLine);

	const iconUpperCircle = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"circle"
	);
	iconUpperCircle.setAttribute("cx", "6.5");
	iconUpperCircle.setAttribute("cy", "6.5");
	iconUpperCircle.setAttribute("r", "2.5");
	iconSvg.appendChild(iconUpperCircle);

	const iconLowerCircle = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"circle"
	);
	iconLowerCircle.setAttribute("cx", "17.5");
	iconLowerCircle.setAttribute("cy", "17.5");
	iconLowerCircle.setAttribute("r", "2.5");
	iconSvg.appendChild(iconLowerCircle);

	return node.appendChild(iconSvg);
}

function getLevelMethod(level: number, setting: PageStatsSettings): string {
	if (level < 2 && level > 3) {
		return "";
	}

	level = level - 2;
	const levels = ["**", "=="];

	if (setting.order == "default") {
		return levels[level];
	} else {
		return levels.reverse()[level];
	}
}

function getLevelValue(pageStats: PageStats, levelMethod: string): string {
	let value = 0;

	if (levelMethod == "==") {
		value = pageStats.num_words_highlighted;
	} else if (levelMethod == "**") {
		value = pageStats.num_words_bold;
	}

	if (value > 0) {
		return `${value.toString()} (${Math.round(
			(value / pageStats.num_words_cite) * 100
		).toString()}%)`;
	} else {
		return `0 (0%)`;
	}
}

function renderLevelEl(
	pageStats: PageStats,
	level: number,
	levelMethod: string,
	node: Element
): Element {
	console.log(
		`Creating Element Level ${level.toString()} (${levelMethod}) with value ${getLevelValue(
			pageStats,
			levelMethod
		)}`
	);
	return (
		node.createDiv(
			{
				cls: "page-stat-key",
			},
			(keyEl) => {
				keyEl.createSpan(
					{
						cls: "page-stat-key-icon",
					},
					(iconEl) => renderSumIcon(iconEl)
				),
					keyEl.createSpan({
						cls: "page-stat-key-name",
						text: `Layer ${level.toString()} (${levelMethod})`,
					});
			}
		),
		node.createDiv({
			cls: "page-stat-value",
			text: getLevelValue(pageStats, levelMethod),
		})
	);
}

function renderView(
	pageStats: PageStats,
	settings: PageStatsSettings,
	container: Element
): void {
	container.empty();

	const viewContent: HTMLDivElement = container.createDiv({
		cls: "view-content",
	});

	const pageStatsContainer: HTMLDivElement = viewContent.createDiv({
		cls: "page-stats-container",
	});

	const pageStatsContent: HTMLDivElement = viewContent.createDiv({
		cls: "page-stats-content",
	});

	const pageStatsItem: HTMLDivElement = pageStatsContent.createDiv({
		cls: "page-stats-content",
	});

	const pageStatsEl: HTMLDivElement = pageStatsItem.createDiv({
		cls: "page-stats",
	});

	pageStatsEl.createDiv(
		{
			cls: "page-stat",
			attr: { draggable: true },
		},
		(el) => {
			el.createDiv(
				{
					cls: "page-stat-key",
				},
				(keyEl) => {
					keyEl.createSpan(
						{
							cls: "page-stat-key-icon",
						},
						(iconEl) => renderSumIcon(iconEl)
					),
						keyEl.createSpan({
							cls: "page-stat-key-name",
							text: "Highlights",
						});
				}
			),
				el.createDiv({
					cls: "page-stat-value",
					text: pageStats.num_blocks_cite.toString(),
				});
		}
	);

	pageStatsEl.createDiv(
		{
			cls: "page-stat",
			attr: { draggable: true },
		},
		(el) => {
			el.createDiv(
				{
					cls: "page-stat-key",
				},
				(keyEl) => {
					keyEl.createSpan(
						{
							cls: "page-stat-key-icon",
						},
						(iconEl) => renderSumIcon(iconEl)
					),
						keyEl.createSpan({
							cls: "page-stat-key-name",
							text: "Comments",
						});
				}
			),
				el.createDiv({
					cls: "page-stat-value",
					text: pageStats.num_comments.toString(), //TODO
				});
		}
	);

	pageStatsEl.createDiv(
		{
			cls: "page-stat",
			attr: { draggable: true },
		},
		(el) => {
			el.createDiv(
				{
					cls: "page-stat-key",
				},
				(keyEl) => {
					keyEl.createSpan(
						{
							cls: "page-stat-key-icon",
						},
						(iconEl) => renderSumIcon(iconEl)
					),
						keyEl.createSpan({
							cls: "page-stat-key-name",
							text: "Layer 1",
						});
				}
			),
				el.createDiv({
					cls: "page-stat-value",
					text: pageStats.num_words_cite.toString(),
				});
		}
	);

	pageStatsEl.createDiv(
		{
			cls: "page-stat",
			attr: { draggable: true },
		},
		(el) => renderLevelEl(pageStats, 2, getLevelMethod(2, settings), el)
	);

	pageStatsEl.createDiv(
		{
			cls: "page-stat",
			attr: { draggable: true },
		},
		(el) => renderLevelEl(pageStats, 3, getLevelMethod(3, settings), el)
	);
}
