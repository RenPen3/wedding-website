/**
 * Memory Lane — update dates, titles, descriptions, and image paths here.
 * Drop photos into public/story/memory-lane/ (e.g. how-we-met.jpg).
 */

export type Bilingual = { en: string; es: string };

export type MemoryLaneItem = {
	id: string;
	date: Bilingual;
	title: Bilingual;
	description: Bilingual;
	/** Path from /public, e.g. /story/memory-lane/mem-1.jpg */
	image: string;
};

export const memoryLaneHeading: Bilingual = {
	en: 'Memory Lane',
	es: 'Camino de recuerdos',
};

export const storyTimelineHeading: Bilingual = {
	en: 'How It All Began',
	es: 'Cómo comenzó todo',
};

/** Full-bleed hero background for the Our Story page */
export const memoryLaneHero = {
	desktopImage: '/images/our_story_hero2.jpg',
	mobileImage: '/images/our_story_hero2.jpg',
};

export const memoryLaneItems: MemoryLaneItem[] = [
	{
		id: 'how-we-met',
		date: { en: 'JUNE 2020', es: 'JUNIO 2020' },
		title: { en: 'The Day We Met', es: 'El día que nos conocimos' },
		description: {
			en: 'A chance encounter at a cozy coffee shop changed everything. One conversation turned into hours, and we knew something special had begun.',
			es: 'Un encuentro casual en una acogedora cafetería lo cambió todo. Una conversación se convirtió en horas, y supimos que algo especial había comenzado.',
		},
		image: '/story/memory-lane/mem-1.jpg',
	},
	{
		id: 'first-date',
		date: { en: 'AUGUST 2020', es: 'AGOSTO 2020' },
		title: { en: 'Our First Date', es: 'Nuestra primera cita' },
		description: {
			en: 'Candlelight, laughter, and butterflies. That magical evening confirmed what our hearts already knew.',
			es: 'Luz de velas, risas y mariposas. Esa noche mágica confirmó lo que nuestros corazones ya sabían.',
		},
		image: '/story/memory-lane/mem-2.jpg',
	},
];
