import type { AnyModel } from "./crudFactory";
import { crudController } from "./crudFactory";
import { CategoryModel } from "../models/Category";
import { CouponModel } from "../models/Coupon";
import { HomeSectionModel } from "../models/HomeSection";
import { ServiceModel } from "../models/Service";

export const categoryController = crudController({
  model: CategoryModel as unknown as AnyModel,
  label: "Category",
  activeField: "isActive",
  slugged: true,
  sort: { order: 1, name: 1 },
});

export const serviceController = crudController({
  model: ServiceModel as unknown as AnyModel,
  label: "Service",
  activeField: "isActive",
  slugged: true,
  sort: { order: 1, title: 1 },
  extraFilter: (query) => (query["showOnHome"] === "true" ? { showOnHome: true } : {}),
});

export const homeSectionController = crudController({
  model: HomeSectionModel as unknown as AnyModel,
  label: "Home section",
  activeField: "isVisible",
  sort: { order: 1 },
});

export const couponController = crudController({
  model: CouponModel as unknown as AnyModel,
  label: "Coupon",
  sort: { createdAt: -1 },
});
