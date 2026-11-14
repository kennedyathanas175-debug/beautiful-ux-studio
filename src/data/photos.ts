import kilimanjaro from "@/assets/tz-kilimanjaro.jpg.asset.json";
import darDusk from "@/assets/tz-dar-dusk.jpg.asset.json";
import stoneTown from "@/assets/tz-stone-town.jpg.asset.json";
import dodoma from "@/assets/tz-dodoma.jpg.asset.json";
import arusha from "@/assets/tz-arusha.jpg.asset.json";
import serengeti from "@/assets/tz-serengeti.jpg.asset.json";

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
    src: darDusk.url,
    place: "Dar es Salaam",
    credit: "Muhammad Mahdi Karim",
    license: "GFDL 1.2",
    source: "https://commons.wikimedia.org/wiki/File:Dar_es_Salaam_before_dusk.jpg",
  },
  kilimanjaro: {
    src: kilimanjaro.url,
    place: "Mount Kilimanjaro",
    credit: "Muhammad Mahdi Karim",
    license: "GFDL 1.2",
    source: "https://commons.wikimedia.org/wiki/File:Mount_Kilimanjaro_Dec_2009_edit1.jpg",
  },
  stoneTown: {
    src: stoneTown.url,
    place: "Stone Town, Zanzibar",
    credit: "Timothy A. Gonsalves",
    license: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Sail_Boat_Sunset_Stone_Town_Zanzibar_Oct26_OM3_1123.jpg",
  },
  arusha: {
    src: arusha.url,
    place: "Arusha & Mount Meru",
    credit: "Halidtz",
    license: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Arusha_City_view.jpg",
  },
  dodoma: {
    src: dodoma.url,
    place: "Nyerere Square, Dodoma",
    credit: "Mchiriku",
    license: "CC BY-SA 3.0",
    source: "https://commons.wikimedia.org/wiki/File:Nyerere_Square_in_Dodoma.jpg",
  },
  serengeti: {
    src: serengeti.url,
    place: "Serengeti National Park",
    credit: "Ikiwaner",
    license: "GFDL 1.2",
    source: "https://commons.wikimedia.org/wiki/File:Serengeti_Elefantenherde1.jpg",
  },
} satisfies Record<string, Photo>;

export const allPhotos: Photo[] = Object.values(photos);
