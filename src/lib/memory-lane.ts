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
	/** CSS object-position for cropping, e.g. "top center" */
	imagePosition?: string;
	/** CSS object-fit override, e.g. "contain" to show more of the photo */
	imageFit?: 'cover' | 'contain';
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
		image: '/images/we_met.png',
	},
	{
		id: 'first-date',
		date: { en: 'FEBRUARY 2015', es: 'FEBRERO 2015' },
		title: { en: 'Our First Date', es: 'Nuestra primera cita' },
		description: {
			en: 'Our first date was at Oggi’s in Canyon Country, followed by a movie and ice cream at Cold Stone. I showed up wearing a big boot from a left leg injury and was basically walking like a zombie, but somehow that made the night even more memorable. Between the laughs, the licorice, and a little movie-theater flirting, it became the start of a story we never wanted to end.',
			es: 'Nuestra primera cita fue en Oggi’s en Canyon Country, seguida de una película y helado en Cold Stone. Llegué con una bota grande por una lesión en la pierna izquierda y básicamente caminaba como un zombi, pero de alguna manera eso hizo la noche aún más memorable. Entre las risas, el regaliz y un poco de coqueteo en el cine, se convirtió en el comienzo de una historia que nunca quisimos que terminara.',
		},
		image: '/images/first_date.png',
	},
	{
		id: 'favorite-memory',
		date: { en: 'THROUGH THE YEARS', es: 'A TRAVÉS DE LOS AÑOS' },
		title: { en: 'Favorite Memories', es: 'Recuerdos favoritos' },
		description: {
			en: 'Through the years, we have shared so many memories that mean the world to us, traveling to new places, laughing over the little things, and growing together through every season. From everyday moments to unforgettable adventures, each memory has become a part of our story.',
			es: 'A través de los años, hemos compartido tantos recuerdos que significan el mundo para nosotros: viajar a nuevos lugares, reírnos de las pequeñas cosas y crecer juntos en cada etapa. Desde momentos cotidianos hasta aventuras inolvidables, cada recuerdo se ha convertido en parte de nuestra historia.',
		},
		image: '/images/fav_mem_img.jpg',
	},
	{
		id: 'the-proposal',
		date: { en: 'SPRING 2025', es: 'PRIMAVERA 2025' },
		title: { en: 'The Proposal', es: 'La propuesta' },
		description: {
			en: 'After 10 years together, June Lake became the place where we started our next chapter. I set up my camera and drone to capture the moment I asked Jocelyn to marry me, and her reaction made it perfect. Somehow, between the snow the day before and the storm the next day, we got the most beautiful day to say yes.',
			es: 'Después de 10 años juntos, June Lake se convirtió en el lugar donde comenzamos nuestro siguiente capítulo. Preparé mi cámara y dron para capturar el momento en que le pedí a Jocelyn que se casara conmigo, y su reacción lo hizo perfecto. De alguna manera, entre la nieve del día anterior y la tormenta del día siguiente, tuvimos el día más hermoso para decir que sí.',
		},
		image: '/images/proposal_img.jpg',
	},
	{
		id: 'engagement',
		date: { en: 'SUMMER 2025', es: 'VERANO 2025' },
		title: { en: 'Engagement Party', es: 'Fiesta de compromiso' },
		description: {
			en: 'Surrounded by the people we love most, we celebrated our engagement and the next chapter of our story. The night was filled with laughter, love, happy tears, and moments that reminded us how blessed we are to share this season with our family and friends.',
			es: 'Rodeados de las personas que más amamos, celebramos nuestro compromiso y el siguiente capítulo de nuestra historia. La noche estuvo llena de risas, amor, lágrimas de alegría y momentos que nos recordaron lo bendecidos que somos de compartir esta etapa con nuestra familia y amigos.',
		},
		image: '/images/engagement.png',
	},
	{
		id: 'planning-the-wedding',
		date: { en: 'NOW', es: 'HOY' },
		title: { en: 'Planning Our Wedding', es: 'Planeando nuestra boda' },
		description: {
			en: 'We are planning a life full of adventure, patience, and a lot of shared dessert. September cannot come soon enough.',
			es: 'Estamos planeando una vida llena de aventura, paciencia y mucho postre compartido. Septiembre no puede llegar pronto.',
		},
		image: '/images/planning.jpg',
	},
];
