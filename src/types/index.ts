export type SheetRecord = Record<string, string>;

export type MenuItem = {
  name: string;
  path: string;
  icon: string;
  children?: MenuItem[];
};
