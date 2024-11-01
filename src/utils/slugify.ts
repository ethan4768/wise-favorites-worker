import kebabcase from "lodash.kebabcase";

export const slugify = (str: string) => kebabcase(str);
