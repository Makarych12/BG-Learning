import rawPhotos from "./photos.json";
export type Photo = {
  id: string;
  bg: string;
  subject: string;
  path: string;
  author: string;
  source: string;
  license: string;
  licenseUrl: string;
  description: string;
};
export const photos = rawPhotos as Photo[];
