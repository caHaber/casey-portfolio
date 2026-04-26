export interface Project {
	title: string;
	description: string;
	image: string;
	href: string;
	tags: string[];
}

export interface ExperienceSection {
	company: string;
	role: string;
	period: string;
	projects: Project[];
}

export const experience: ExperienceSection[] = [
	{
		company: 'Atlassian',
		role: 'Lead Visualization Engineer',
		period: '2021 – Present',
		projects: [
			{
				title: 'Viz Platform Charts',
				description:
					"Designed and built @atlassian/viz-platform-charts from the ground up — Atlassian's primary data visualization library, now serving 28+ engineering teams and 4M MAU. Defined a novel slot-based React composition model and opened the library to company-wide contribution through an AI-assisted authoring path.",
				image: '/images/projects/viz-platform.svg',
				href: 'https://www.atlassian.com/platform/analytics/what-is-atlassian-analytics#why-use-atlassian-analytics',
				tags: ['React', 'TypeScript', 'D3.js']
			},
			{
				title: 'Home Dashboards',
				description:
					'Led the visualization surfaces powering Atlassian Home dashboards — the central hub where users see activity and metrics across all Atlassian products.',
				image: '/images/projects/home-dashboards.png',
				href: 'https://community.developer.atlassian.com/t/introducing-atlassian-home-dashboards/91079',
				tags: ['React', 'TypeScript', 'Dashboards']
			},
			{
				title: 'Forge UI Visualizations',
				description:
					'Extended the viz platform to support the new Forge UI — enabling third-party developers to embed rich chart experiences in their Atlassian apps.',
				image: '/images/projects/forge-ui.png',
				href: 'https://www.atlassian.com/blog/developer/meet-the-new-forge-ui-more-features-flexible-experience',
				tags: ['React', 'TypeScript', 'Embeddable charts']
			},
			{
				title: 'Table Chart Rebuild',
				description:
					"Tech-led the table chart rebuild — the platform's most-used widget — shipping features like sparklines and auto-heatmaps that weren't possible under the legacy architecture.",
				image: '/images/projects/table-chart.gif',
				href: 'https://community.atlassian.com/forums/Atlassian-Analytics-articles/We-re-introducing-a-new-table-chart-experience/ba-p/2450718',
				tags: ['React', 'TypeScript', 'Data tables']
			}
		]
	},
	{
		company: 'Chartio',
		role: 'Lead Visualization Engineer',
		period: '2019 – 2021',
		projects: [
			{
				title: 'Vega-Lite Visualization Library',
				description:
					"Architected Chartio's Vega-Lite-based visualization library — designed the grammar layer, authoring experience, and chart catalog powering thousands of customer dashboards.",
				image: '/images/projects/chartio-vega.png',
				href: 'https://web.archive.org/web/20210423171127/https://chartio.com/blog/a-deeper-look-into-chartios-visualization-library/',
				tags: ['Vega-Lite', 'JavaScript', 'SVG']
			},
			{
				title: 'Sparklines & New Chart Types',
				description:
					'Shipped new chart types including sparklines and an all-new chart catalog, expanding the range of visualizations available to Chartio customers.',
				image: '/images/projects/chartio-sparklines.png',
				href: 'https://web.archive.org/web/20220926150706/https://chartio.com/blog/new-chart-type-sparklines/',
				tags: ['Vega-Lite', 'JavaScript', 'Chart catalog']
			},
			{
				title: 'How We Feel',
				description:
					'Built a public data visualization project for pandemic user-generated data, in partnership with the How We Feel app — turning self-reported health data into actionable visual insights.',
				image: '/images/projects/how-we-feel.png',
				href: 'https://web.archive.org/web/20210801083324/https://chartio.com/blog/how-we-feel-app-aims-to-combat-coronavirus-with-user-generated-data/',
				tags: ['Data visualization', 'Public health', 'Vega-Lite']
			}
		]
	},
	{
		company: 'Two Six Labs',
		role: 'Data Visualization Scientist & Research Engineer',
		period: '2018 – 2019',
		projects: [
			{
				title: 'Code Repository Analysis Tool',
				description:
					'Co-authored best-paper winner at VDA 2020: a visualization tool for analyzing the suitability of software libraries via their code repositories. Also inventor on US Patent 11,487,538.',
				image: '/images/projects/code-repo-analysis.png',
				href: 'https://twosixtech.com/choosing-open-source-libraries-and-analyzing-risks/',
				tags: ['D3.js', 'Research', 'Patent', 'ML']
			},
			{
				title: 'Stack Overflow Tag Visualization',
				description:
					'Designed and shipped an interactive exploration of developer tag co-occurrence on Stack Overflow — revealing how programming communities cluster and evolve.',
				image: '/images/projects/so-image.png',
				href: 'https://twosixtech.com/blog/visualizing-programming-behaviors-with-stack-overflow/',
				tags: ['D3.js', 'Interactive', 'ML']
			}
		]
	}
];

export const research = [
	{
		title: 'Best Paper — VDA 2020',
		description:
			'Haber, C. & Gove, R. "A Visualization Tool for Analyzing the Suitability of Software Libraries via Their Code Repositories."',
		href: 'https://twosixtech.com/choosing-open-source-libraries-and-analyzing-risks/'
	},
	{
		title: 'ACM BELIV Workshop',
		description:
			'Haber, C. (contributor). "Do Defaults Matter? Evaluating the Effect of Defaults on User Preference for Multi-Class Scatterplots."',
		href: 'https://dl.acm.org/doi/epdf/10.1145/2968220.2968241'
	},
	{
		title: 'US Patent 11,487,538',
		description: 'Methods for evaluating software libraries via repository analysis.',
		href: 'https://patents.google.com/patent/US11487538B1/en'
	}
];
