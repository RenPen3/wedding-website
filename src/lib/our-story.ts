/**
 * Our Story — update copy and image paths here.
 * Drop photos into public/story/ (e.g. how-we-met.jpg). SVG placeholders ship by default — change
 * each `image` path from .svg to .jpg when your photo is ready.
 */

export type Bilingual = { en: string; es: string };

export type TimelineItem = {
	/** Used for file naming, e.g. public/story/how-we-met.jpg */
	id: string;
	/** Background image path from /public */
	image: string;
	date: Bilingual;
	title: Bilingual;
	text: Bilingual;
};

export const storyIntro: Bilingual = {
	en: 'Every love story is beautiful, but ours is our favorite. Here are a few chapters from the journey that brought us to this day.',
	es: 'Cada historia de amor es hermosa, pero la nuestra es nuestra favorita. Aquí hay algunos capítulos del camino que nos trajo hasta este día.',
};

export const timelineItems: TimelineItem[] = [
	{
		id: 'how-we-met',
		image: '/story/how-we-met.svg',
		date: { en: 'Summer 2018', es: 'Verano 2018' },
		title: { en: 'How We Met', es: 'Cómo nos conocimos' },
		text: {
			en: 'A mutual friend, a warm evening, and a conversation that felt like coming home. We laughed until the lights came on and already knew we would meet again.',
			es: 'Un amigo en común, una tarde cálida y una conversación que se sintió como llegar a casa. Reímos hasta que encendieron las luces y ya sabíamos que volveríamos a vernos.',
		},
	},
	{
		id: 'first-date',
		image: '/story/first-date.svg',
		date: { en: 'Fall 2018', es: 'Otoño 2018' },
		title: { en: 'First Date', es: 'Primera cita' },
		text: {
			en: 'Coffee turned into a long walk, then dinner, then stargazing on a blanket in the park. René insisted on sharing his jacket; Jocelyn insisted she was not cold.',
			es: 'El café se volvió un paseo largo, luego cena, luego ver las estrellas en una manta en el parque. René insistió en compartir su chaqueta; Jocelyn insistió en que no tenía frío.',
		},
	},
	{
		id: 'favorite-memory',
		image: '/story/favorite-memory.svg',
		date: { en: 'Through the years', es: 'A través de los años' },
		title: { en: 'Favorite Memory', es: 'Recuerdo favorito' },
		text: {
			en: 'Road trips with the windows down, Sunday breakfasts in pajamas, and dancing in the kitchen when our favorite song came on—ordinary moments that became our happiest ones.',
			es: 'Viajes por carretera con las ventanas abajo, desayunos dominicales en pijama y bailar en la cocina cuando sonaba nuestra canción—momentos sencillos que se volvieron los más felices.',
		},
	},
	{
		id: 'the-proposal',
		image: '/story/the-proposal.svg',
		date: { en: 'Spring 2025', es: 'Primavera 2025' },
		title: { en: 'The Proposal', es: 'La propuesta' },
		text: {
			en: 'At golden hour on a hillside overlooking the valley, with family waiting just out of sight, René asked the question and Jocelyn said yes before he finished the sentence.',
			es: 'Al atardecer en una colina con vista al valle, con la familia esperando a la distancia, René hizo la pregunta y Jocelyn dijo que sí antes de que terminara la frase.',
		},
	},
	{
		id: 'engagement',
		image: '/story/engagement.svg',
		date: { en: 'Now', es: 'Hoy' },
		title: { en: 'Engagement', es: 'Compromiso' },
		text: {
			en: 'We are planning a life full of adventure, patience, and a lot of shared dessert. September cannot come soon enough.',
			es: 'Estamos planeando una vida llena de aventura, paciencia y mucho postre compartido. Septiembre no puede llegar pronto.',
		},
	},
];

/** Vimeo embed — change vimeoId if you replace the video */
export const engagementVideo = {
	vimeoId: '1194249643',
	iframeTitle: 'Engagement-Party-Final',
	title: { en: 'Watch Our Story', es: 'Mira nuestra historia' } satisfies Bilingual,
	subtitle: {
		en: 'Our engagement film',
		es: 'Nuestra película de compromiso',
	} satisfies Bilingual,
};
