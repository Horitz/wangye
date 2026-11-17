export type HomeImage = {
  id: string;
  src: string;
  alt: { zh: string; ru: string };
  location: { zh: string; ru: string };
  credit: string;
  creditUrl: string;
  license: string;
};

export const homeImages: HomeImage[] = [
  {
    id: "msu",
    src: "/images/msu-main.jpg",
    alt: { zh: "从罗蒙诺索夫广场望向莫斯科国立大学主楼", ru: "Главное здание МГУ со стороны площади Ломоносова" },
    location: { zh: "莫斯科 · МГУ 主楼", ru: "Москва · Главное здание МГУ" },
    credit: "© Vyacheslav Argenberg",
    creditUrl: "https://commons.wikimedia.org/wiki/File:Moscow_State_University,_Main_building,_Moscow,_Russia.jpg",
    license: "CC BY 4.0",
  },
  {
    id: "city",
    src: "/images/moscow-city.jpg",
    alt: { zh: "傍晚从大莫斯科河桥望向莫斯科河与克里姆林宫", ru: "Вечерний вид на Москву-реку и Кремль с Большого Москворецкого моста" },
    location: { zh: "莫斯科 · 莫斯科河", ru: "Москва · Набережная Москвы-реки" },
    credit: "© Vyacheslav Argenberg",
    creditUrl: "https://commons.wikimedia.org/wiki/File:Moskva_River_and_Kremlin_from_Bolshoy_Moskvoretsky_Bridge,_Moscow,_Russia.jpg",
    license: "CC BY 4.0",
  },
  {
    id: "campus",
    src: "/images/campus-life.jpg",
    alt: { zh: "莫斯科国立大学植物园的秋日高处景观", ru: "Осенний вид сверху на Ботанический сад МГУ" },
    location: { zh: "莫斯科 · МГУ 植物园", ru: "Москва · Ботанический сад МГУ" },
    credit: "© Vyacheslav Argenberg",
    creditUrl: "https://commons.wikimedia.org/wiki/File:Moscow_State_University,_Botanical_Gardens,_Moscow,_Russia.jpg",
    license: "CC BY 4.0",
  },
];
