/**
 * Memory Lane — update years, captions, and image paths here.
 * Drop photos into public/story/memory-lane/ (e.g. 2015.jpg). SVG placeholders ship by default.
 */

export type Bilingual = { en: string; es: string };

export type MemoryLaneItem = {
	/** Stable id for keys and file naming */
	id: string;
	year: string;
	caption: Bilingual;
	/** Path from /public, e.g. /story/memory-lane/2015.jpg */
	image: string;
	/** Optional longer text shown beside the photo on desktop */
	description?: Bilingual;
};

export const memoryLaneHeading: Bilingual = {
	en: 'Memory Lane',
	es: 'Camino de recuerdos',
};

export const memoryLaneItems: MemoryLaneItem[] = [
	{
		id: '2015',
		year: '2015',
		caption: {
			en: 'Where our story began',
			es: 'Donde comenzó nuestra historia',
		},
		image: '/story/memory-lane/2015.svg',
	},
	{
		id: '2017',
		year: '2017',
		caption: {
			en: 'From strangers to something special',
			es: 'De desconocidos a algo especial',
		},
		image: '/story/memory-lane/2017.svg',
	},
	{
		id: '2019',
		year: '2019',
		caption: {
			en: 'The first time we said “I love you”',
			es: 'La primera vez que dijimos “te amo”',
		},
		image: '/story/memory-lane/2019.svg',
	},
	{
		id: '2022',
		year: '2022',
		caption: {
			en: 'Even the pandemic couldn’t pause us',
			es: 'Ni la pandemia pudo detenernos',
		},
		image: '/story/memory-lane/2022.svg',
	},
	{
		id: '2024',
		year: '2024',
		caption: {
			en: 'Growing stronger side by side',
			es: 'Creciendo juntos, más fuertes',
		},
		image: '/story/memory-lane/2024.svg',
	},
	{
		id: '2026',
		year: '2026',
		caption: {
			en: 'From a question to a lifetime promise',
			es: 'De una pregunta a una promesa de por vida',
		},
		image: '/story/memory-lane/2026.svg',
	},
];
