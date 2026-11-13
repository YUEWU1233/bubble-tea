export const categories = [
  { id: 1, name: "熟食" },
  { id: 2, name: "饮品" },
] as const;

export const subcategories = {
  bao: { categoryId: 1, name: "包子" },
  dumplings: { categoryId: 1, name: "饺子" },
  sides: { categoryId: 1, name: "小食" },
  salads: { categoryId: 1, name: "沙拉" },
  milkTea: { categoryId: 2, name: "奶茶" },
  cheeseFoam: { categoryId: 2, name: "奶盖茶" },
  freshFruitTea: { categoryId: 2, name: "新鲜水果茶" },
  freshMilk: { categoryId: 2, name: "鲜奶" },
  fruitTea: { categoryId: 2, name: "水果茶" },
  coconut: { categoryId: 2, name: "椰椰系列" },
  soyMilk: { categoryId: 2, name: "豆浆" },
} as const;

export type SubcategoryId = keyof typeof subcategories;

export type Variant = {
  id: string;
  label: string;
  priceCents: number;
  stockUnits?: number;
};

export type Product = {
  id: string;
  name: string;
  subcategory: SubcategoryId;
  unavailable?: boolean;
  variants: readonly Variant[];
};

// 价格用整数分保存，例如 790 表示 CHF 7.90。
function drinkSizes(price500: number, price700: number): Variant[] {
  return [
    { id: "500ml", label: "中杯 · 500 mL", priceCents: price500 },
    { id: "700ml", label: "大杯 · 700 mL", priceCents: price700 },
  ];
}

const standardDrink = drinkSizes(700, 800);
const premiumDrink = drinkSizes(800, 900);
const freshFruitDrink = drinkSizes(800, 900);

// stockUnits 表示卖出一个该规格时，要扣减的库存个数。
const baoVariants: Variant[] = [
  { id: "single", label: "单个", priceCents: 400, stockUnits: 1 },
  { id: "portion-3", label: "3 个／份", priceCents: 1000, stockUnits: 3 },
];

const dumplingVariants: Variant[] = [
  { id: "portion-5", label: "5 个／份", priceCents: 1000, stockUnits: 5 },
];

export const products: readonly Product[] = [
  // 包子
  { id: "B1", name: "猪肉白菜包", subcategory: "bao", variants: baoVariants },
  { id: "B2", name: "牛肉粉条包", subcategory: "bao", variants: baoVariants },
  { id: "B3", name: "胡萝卜鸡蛋包", subcategory: "bao", variants: baoVariants },
  { id: "B4", name: "香菇节瓜包", subcategory: "bao", variants: baoVariants },
  { id: "B5", name: "红豆沙包", subcategory: "bao", variants: baoVariants },

  // 饺子
  { id: "R6", name: "猪肉白菜饺子", subcategory: "dumplings", variants: dumplingVariants },
  { id: "R7", name: "胡萝卜鸡蛋饺子", subcategory: "dumplings", variants: dumplingVariants },
  { id: "R8", name: "牛肉饺子", subcategory: "dumplings", variants: dumplingVariants },
  { id: "R9", name: "香菇节瓜饺子", subcategory: "dumplings", variants: dumplingVariants },

  // 小食和沙拉
  {
    id: "9",
    name: "五香茶叶蛋",
    unavailable: true,
    subcategory: "sides",
    variants: [{ id: "single", label: "1 个", priceCents: 250 }],
  },
  {
    id: "11",
    name: "海带沙拉",
    unavailable: true,
    subcategory: "salads",
    variants: [{ id: "portion", label: "1 份", priceCents: 900 }],
  },
  {
    id: "12",
    name: "蔬菜沙拉",
    unavailable: true,
    subcategory: "salads",
    variants: [{ id: "portion", label: "1 份", priceCents: 900 }],
  },

  // 奶茶
  {
    id: "MT01",
    name: "黑糖珍珠",
    subcategory: "milkTea",
    variants: standardDrink 
  },
  { id: "MT02", name: "奥利奥奶茶", subcategory: "milkTea", variants: standardDrink },
  { id: "MT03", name: "芋泥谷香血糯米", subcategory: "milkTea", variants: standardDrink },
  { id: "MT04", name: "泰式奶茶", subcategory: "milkTea", variants: standardDrink },
  { id: "MT05", name: "茉香云顶抹茶", subcategory: "milkTea", variants: premiumDrink },
  { id: "MT06", name: "花田乌龙", subcategory: "milkTea", variants: premiumDrink },
  { id: "MT07", name: "茉香满街", subcategory: "milkTea", variants: premiumDrink },
  { id: "MT08", name: "伯牙绝弦", subcategory: "milkTea", variants: premiumDrink },
  { id: "MT09", name: "幽兰拿铁", subcategory: "milkTea", variants: premiumDrink },
  { id: "MT10", name: "声声乌龙", subcategory: "milkTea", variants: premiumDrink },
  { id: "MT11", name: "山野栀子", subcategory: "milkTea", variants: premiumDrink },

  // 奶盖茶
  { id: "CF01", name: "芝芝芒芒", subcategory: "cheeseFoam", variants: standardDrink },
  { id: "CF02", name: "芝芝葡萄", subcategory: "cheeseFoam", variants: standardDrink },
  { id: "CF03", name: "芝芝草莓", subcategory: "cheeseFoam", variants: standardDrink },
  { id: "CF04", name: "芝芝桃桃", subcategory: "cheeseFoam", variants: standardDrink },
  { id: "CF05", name: "椰芝芒芒", subcategory: "cheeseFoam", variants: standardDrink },

  // 新鲜水果茶
  { id: "FF01", name: "手打柠檬茶", subcategory: "freshFruitTea", variants: freshFruitDrink },
  { id: "FF02", name: "暴打草莓茶", subcategory: "freshFruitTea", variants: freshFruitDrink },
  { id: "FF03", name: "暴打草莓柠檬茶", subcategory: "freshFruitTea", variants: freshFruitDrink },
  { id: "FF04", name: "百香果柠檬茶", subcategory: "freshFruitTea", variants: freshFruitDrink },
  { id: "FF05", name: "芒果柠檬茶", subcategory: "freshFruitTea", variants: freshFruitDrink },
  { id: "FF06", name: "玫瑰荔枝露", subcategory: "freshFruitTea", variants: freshFruitDrink },
  { id: "FF07", name: "桃桃柠檬茶", subcategory: "freshFruitTea", variants: freshFruitDrink },

  // 鲜奶
  { id: "FM01", name: "黑糖脏脏奶", subcategory: "freshMilk", variants: premiumDrink },
  { id: "FM02", name: "草莓鲜奶", subcategory: "freshMilk", variants: premiumDrink },
  { id: "FM03", name: "草莓奶麻薯", subcategory: "freshMilk", variants: premiumDrink },
  { id: "FM04", name: "多肉芒芒牛乳", subcategory: "freshMilk", variants: premiumDrink },
  { id: "FM05", name: "抹茶拿铁", subcategory: "freshMilk", variants: premiumDrink },
  { id: "FM06", name: "牛油果草莓冰沙", subcategory: "freshMilk", variants: premiumDrink },
  { id: "FM07", name: "咖啡拿铁", subcategory: "freshMilk", variants: premiumDrink },

  // 水果茶
  { id: "FT01", name: "芒果水果茶", subcategory: "fruitTea", variants: standardDrink },
  { id: "FT02", name: "百香果水果茶", subcategory: "fruitTea", variants: standardDrink },
  { id: "FT03", name: "水蜜桃水果茶", subcategory: "fruitTea", variants: standardDrink },
  { id: "FT04", name: "荔枝水果茶", subcategory: "fruitTea", variants: standardDrink },
  { id: "FT05", name: "草莓水果茶", subcategory: "fruitTea", variants: standardDrink },
  { id: "FT06", name: "树莓水果茶", subcategory: "fruitTea", variants: standardDrink },
  { id: "FT07", name: "蓝莓水果茶", subcategory: "fruitTea", variants: standardDrink },

  // 椰椰系列
  { id: "CO01", name: "抹茶椰椰麻薯", subcategory: "coconut", variants: premiumDrink },
  { id: "CO02", name: "桂花椰椰冻", subcategory: "coconut", variants: premiumDrink },
  { id: "CO03", name: "芒果奇亚籽椰椰", subcategory: "coconut", variants: premiumDrink },
  { id: "CO04", name: "生椰拿铁", subcategory: "coconut", variants: premiumDrink },
  {
    id: "CO05",
    name: "生椰杨枝甘露",
    subcategory: "coconut",
    variants: [{ id: "700ml", label: "大杯 · 700 mL", priceCents: 900 }],
  },

  // 豆浆
  {
    id: "10",
    name: "中式豆浆",
    subcategory: "soyMilk",
    variants: [{ id: "250ml", label: "250 mL", priceCents: 500 }],
  },
];

export const toppings = [
  { id: "tapioca", name: "珍珠", priceCents: 50 },
  { id: "coconut-jelly", name: "椰果", priceCents: 50 },
  { id: "crystal-boba", name: "脆啵啵", priceCents: 50 },
  { id: "oreo", name: "奥利奥", priceCents: 50 },
  { id: "popping-boba-strawberry", name: "草莓爆爆珠", priceCents: 50 },
  { id: "popping-boba-mango", name: "芒果爆爆珠", priceCents: 50 },
  { id: "popping-boba-passion-fruit", name: "百香果爆爆珠", priceCents: 50 },
  { id: "popping-boba-peach", name: "水蜜桃爆爆珠", priceCents: 50 },
  { id: "popping-boba-lychee", name: "荔枝爆爆珠", priceCents: 50 },
  { id: "mochi", name: "麻薯", priceCents: 100 },
  { id: "cheese-foam", name: "奶盖", priceCents: 100 },
  { id: "red-sticky-rice", name: "血糯米", priceCents: 100 },
] as const;

export type Topping = (typeof toppings)[number];
