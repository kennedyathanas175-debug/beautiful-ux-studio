export interface Photo {
  src: string;
  place: string;
  credit: string;
  license: string;
  source: string;
}

// Real photographs of Tanzania from Wikimedia Commons (free licences; credit required).
export const photos = {
  darDusk: {
    src: "/images/tanzania/tz-dar-dusk.jpg",
    place: "Dar es Salaam",
    credit: "Muhammad Mahdi Karim",
    license: "GFDL 1.2",
    source: "https://commons.wikimedia.org/wiki/File:Dar_es_Salaam_before_dusk.jpg",
  },
  kilimanjaro: {
    src: "/images/tanzania/tz-kilimanjaro.jpg",
    place: "Mount Kilimanjaro",
    credit: "Muhammad Mahdi Karim",
    license: "GFDL 1.2",
    source: "https://commons.wikimedia.org/wiki/File:Mount_Kilimanjaro_Dec_2009_edit1.jpg",
  },
  stoneTown: {
    src: "/images/tanzania/tz-stone-town.jpg",
    place: "Stone Town, Zanzibar",
    credit: "Timothy A. Gonsalves",
    license: "CC BY-SA 4.0",
    source:
      "https://commons.wikimedia.org/wiki/File:Sail_Boat_Sunset_Stone_Town_Zanzibar_Oct26_OM3_1123.jpg",
  },
  arusha: {
    src: "/images/tanzania/tz-arusha.jpg",
    place: "Arusha & Mount Meru",
    credit: "Halidtz",
    license: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Arusha_City_view.jpg",
  },
  dodoma: {
    src: "/images/tanzania/tz-dodoma.jpg",
    place: "Nyerere Square, Dodoma",
    credit: "Mchiriku",
    license: "CC BY-SA 3.0",
    source: "https://commons.wikimedia.org/wiki/File:Nyerere_Square_in_Dodoma.jpg",
  },
  serengeti: {
    src: "/images/tanzania/tz-serengeti.jpg",
    place: "Serengeti National Park",
    credit: "Ikiwaner",
    license: "GFDL 1.2",
    source: "https://commons.wikimedia.org/wiki/File:Serengeti_Elefantenherde1.jpg",
  },
} satisfies Record<string, Photo>;

export const allPhotos: Photo[] = Object.values(photos);
