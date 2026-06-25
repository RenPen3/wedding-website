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
			en: 'Where our story began and where it will continue. Dummy text for the caption.',
			es: 'Donde comenzó nuestra historia y donde continuará. Texto dummy para el caption.',
		},
		image: '/story/memory-lane/mem-1.jpg',
	},
	{
		id: '2017',
		year: '2017',
		caption: {
			en: 'From strangers to something special. Dummy text for the caption.',
			es: 'De desconocidos a algo especial. Texto dummy para el caption.',
		},
		image: '/story/memory-lane/mem-2.jpg',
	},
	{
		id: '2019',
		year: '2019',
		caption: {
			en: 'The first time we said “I love you” And everything changed. Dummy text for the caption.',
			es: 'La primera vez que dijimos “te amo” Y todo cambió. Texto dummy para el caption.',
		},
		image: '/story/memory-lane/mem-3.jpg',
	},
	{
		id: '2022',
		year: '2022',
		caption: {
			en: 'Even the pandemic couldn’t pause us. Dummy text for the caption.',
			es: 'Ni la pandemia pudo detenernos. Texto dummy para el caption.',
		},
		image: '/story/memory-lane/mem-4.jpg',
	},
	{
		id: '2024',
		year: '2024',
		caption: {
			en: 'Growing stronger side by side. Dummy text for the caption.',
			es: 'Creciendo juntos, más fuertes',
		},
		image: '/story/memory-lane/mem-5.jpg',
	},
	{
		id: '2026',
		year: '2026',
		caption: {
			en: 'From a question to a lifetime promise. Dummy text for the caption.',
			es: 'De una pregunta a una promesa de por vida Texto dummy para el caption.',
		},
		image: '/story/memory-lane/mem-6.jpg',
	},
];
