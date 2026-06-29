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
		date: { en: 'FEBRUARY 2015', es: 'FEBRERO 2015' },
		title: { en: 'The Day We Met', es: 'El día que nos conocimos' },
		description: {
			en: 'We met through a co-worker friend who showed us each other’s picture. At first, we both thought the age difference was too much. But later that night, I asked for Jocelyn’s number, sent her a text while she was at work, and that’s where our story began.',
			es: 'Nos conocimos gracias a una amiga compañera de trabajo que nos mostró fotos el uno del otro. Al principio, los dos pensamos que la diferencia de edad era demasiado. Pero esa misma noche, le pedí el número a Jocelyn, le envié un mensaje mientras estaba en el trabajo, y ahí comenzó nuestra historia.',
		},
		image: '/story/memory-lane/mem-1.jpg',
	},
	{
		id: 'first-date',
		date: { en: 'FEBRUARY 2015', es: 'FEBRERO 2015' },
		title: { en: 'Our First Date', es: 'Nuestra primera cita' },
		description: {
			en: 'Our first date was at Oggi’s in Canyon Country, followed by a movie and ice cream at Cold Stone. I was wearing a big boot from a left leg injury, walking like a zombie, but we still had the best time. Between laughs, licorice, and a little movie-theater flirting, it became a night we would never forget.',
			es: 'Nuestra primera cita fue en Oggi’s en Canyon Country, seguida de una película y helado en Cold Stone. Llevaba una bota grande por una lesión en la pierna izquierda, caminando como un zombi, pero aun así lo pasamos increíble. Entre risas, regaliz y un poco de coqueteo en el cine, se convirtió en una noche que nunca olvidaremos.',
		},
		image: '/story/memory-lane/mem-2.jpg',
	},
	{
		id: 'favorite-memory',
		date: { en: 'THROUGH THE YEARS', es: 'A TRAVÉS DE LOS AÑOS' },
		title: { en: 'Favorite Memories', es: 'Recuerdos favoritos' },
		description: {
			en: 'Road trips with the windows down, Sunday breakfasts in pajamas, and dancing in the kitchen when our favorite song came on—ordinary moments that became our happiest ones.',
			es: 'Viajes por carretera con las ventanas abajo, desayunos dominicales en pijama y bailar en la cocina cuando sonaba nuestra canción—momentos sencillos que se volvieron los más felices.',
		},
		image: '/story/memory-lane/mem-3.jpg',
	},
	{
		id: 'the-proposal',
		date: { en: 'SPRING 2025', es: 'PRIMAVERA 2025' },
		title: { en: 'The Proposal', es: 'La propuesta' },
		description: {
			en: 'At golden hour on a hillside overlooking the valley, with family waiting just out of sight, René asked the question and Jocelyn said yes before he finished the sentence.',
			es: 'Al atardecer en una colina con vista al valle, con la familia esperando a la distancia, René hizo la pregunta y Jocelyn dijo que sí antes de que terminara la frase.',
		},
		image: '/story/memory-lane/mem-4.jpg',
	},
	{
		id: 'engagement',
		date: { en: 'SUMMER 2025', es: 'VERANO 2025' },
		title: { en: 'Engagement Party', es: 'Fiesta de compromiso' },
		description: {
			en: 'Surrounded by the people we love most, we celebrated the beginning of forever. Laughter, toasts, and happy tears filled a night we will never forget.',
			es: 'Rodeados de las personas que más amamos, celebramos el comienzo de para siempre. Risas, brindis y lágrimas de alegría llenaron una noche que nunca olvidaremos.',
		},
		image: '/story/memory-lane/mem-5.jpg',
	},
	{
		id: 'planning-the-wedding',
		date: { en: 'NOW', es: 'HOY' },
		title: { en: 'Planning Our Wedding', es: 'Planeando nuestra boda' },
		description: {
			en: 'We are planning a life full of adventure, patience, and a lot of shared dessert. September cannot come soon enough.',
			es: 'Estamos planeando una vida llena de aventura, paciencia y mucho postre compartido. Septiembre no puede llegar pronto.',
		},
		image: '/story/memory-lane/mem-6.jpg',
	},
];
