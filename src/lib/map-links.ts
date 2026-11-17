/** Keep the user's original place link, including its view and rotation. */
export const TWO_GIS_PLACE_URL = "https://2gis.ru/moscow/geo/4504338361748618/37.530417%2C55.701404?m=37.531823%2C55.702069%2F17.23%2Fp%2F42.74%2Fr%2F-41.56";

export const TWO_GIS_PLACE_NAME = "улица Академика Хохлова";

export function getTwoGisSearchUrl(query: string): string {
  const text = query.trim();
  return text ? `https://2gis.ru/moscow/search/${encodeURIComponent(text)}` : TWO_GIS_PLACE_URL;
}

/** Public Map Constructor output; the payload only contains our marker and view. */
export const TWO_GIS_WIDGET_URL = "https://platform.2gis.ru/api/map-constructor/widget?data=eJw1j0FrwkAUhP_L9LrIriZGF3qQiFIaxD21Vjyk5tUu3WTD5inVkP9eXOncZuYxfK-HDxUFqtbka-JgqYPe9-BrS9BYUcnnQBBog28pcOx7sGV37-Vua87zPJG7T9PlS_OzyaeyWBre5EoWN3OOfnGSr-_mwuuVLC7mwvlVFotnCFTUHYNt2foGGhA4eucDNJ6m82Q2SyBwe2kq-oVW8l-DwOkBe40oD9Kttw3HBR8q25QcH5lko3QiE5WJNB1lUiUyOQwCtoJWw0GgLtut7-wDoIcrGTpejuV0LuDucdxQs_FE4OZ9Da2yQaA7Bu_c2zeR-4jpV-k6Gv4AG6Zn-A";
