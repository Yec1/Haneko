// nhentai v2 API 型別定義

export interface NHImageInfo {
  path: string;
  width: number;
  height: number;
}

export interface NHPage {
  number: number;
  path: string;
  width: number;
  height: number;
  thumbnail: string;
  thumbnail_width: number;
  thumbnail_height: number;
}

/** /galleries/{id} 完整回傳 */
export interface NHGallery {
  id: number;
  media_id: string;
  title: {
    english: string;
    japanese: string;
    pretty: string;
  };
  cover: NHImageInfo;
  thumbnail: NHImageInfo;
  upload_date: number;
  scanlator?: string;
  tags: NHTag[];
  num_pages: number;
  num_favorites: number;
  pages?: NHPage[];
}

/** /search 列表結果（flat 結構，欄位較少） */
export interface NHGalleryListItem {
  id: number;
  media_id: string;
  english_title: string;
  japanese_title: string;
  thumbnail: string;          // 相對路徑字串
  thumbnail_width?: number;
  thumbnail_height?: number;
  num_pages: number;
  num_favorites: number;
  tag_ids: number[];
  blacklisted?: boolean;
}

export interface NHTag {
  id: number;
  type: "tag" | "artist" | "parody" | "character" | "group" | "language" | "category";
  name: string;
  slug: string;
  url: string;
  count: number;
}

export interface NHGalleryListResponse {
  result: NHGalleryListItem[];
  total: number;
  per_page: number;
  num_pages: number;
}

export interface NHTokens {
  access_token: string;
  refresh_token: string;
}

export interface NHCdnConfig {
  images: string;
  thumbs: string;
}

export type NHTagType = "tag" | "artist" | "parody" | "character" | "group" | "language" | "category";
export type NHSortType = "popular" | "popular-today" | "popular-week" | "recent";
