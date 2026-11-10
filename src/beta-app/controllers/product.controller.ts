import { Request, Response } from "express";

import { db } from "../database/client.js";
import { Contact, Organisations } from "../database/types.js";
import { postAddEvidenceContactSelfSchema } from "../models/request-schemas/postAddEvidenceContactSelfSchema.js";
import { postMarkUsefulSchema } from "../models/request-schemas/postMarkUsefulSchema.js";
import { ProductAggregation } from "../models/view-models/productAggregation.js";
import { ProductTrusts } from "../models/view-models/productTrusts.js";
import { getContractCountForAggregation } from "../services/atamisService.js";
import {
  getBrowsePathForDevice,
  getGmdnTermForDeviceId,
} from "../services/gmdnCategoryService.js";
import {
  getAggregationForProductId,
  getAggregationWithName,
  getCountOfContactsWithExperienceWithAggregation,
  getCountOfDocumentsByTypeForAggregation,
  getCountOfOrganisationsWithExperienceWithAggregation,
  getEvidenceCardsForAggregation,
  getProductWithId,
} from "../services/productsService.js";
import { getSearchQueryString } from "../services/searchQueryService.js";
import { getSupplierWithId } from "../services/supplierService.js";
import { getSupplierInCategory } from "./deviceType.controller.js";

// An aggregation is identified by its name and supplier, as different
// suppliers can use the same aggregation name for unrelated products
interface AggregationKey {
  aggregationName: string;
  supplierId: number;
}

interface Breadcrumb {
  href: string;
  text: string;
}

// What differs between reaching a product by search and by browsing
interface ProductRoute {
  breadcrumbs: Breadcrumb[];
  // Taken from the URL when browsing, so the page can't contradict its own path
  deviceType?: string;
  deviceTypeHref?: string;
  productHref: string;
  supplierHref?: string;
  supplierName?: string;
  trustsHref: string;
}

// Returns undefined if the URL doesn't name an aggregation and supplier
const getAggregationKeyFromParams = (
  req: Request,
): AggregationKey | undefined => {
  const aggregationName = req.params.aggregationName as string | undefined;
  const supplierId = Number(req.params.supplierId);

  if (!aggregationName || !Number.isInteger(supplierId)) {
    return undefined;
  }

  return { aggregationName, supplierId };
};

const getSearchProductRoute = (
  req: Request,
  { aggregationName, supplierId }: AggregationKey,
): ProductRoute => {
  const productPath = `/supplier/${String(supplierId)}/product/${encodeURIComponent(aggregationName)}`;
  const searchQueryString = getSearchQueryString(req.query);

  return {
    breadcrumbs: [
      { href: "/", text: "Home" },
      searchQueryString
        ? {
            href: `/search-results${searchQueryString}`,
            text: "Search results",
          }
        : { href: "/search", text: "Search" },
    ],
    productHref: `${productPath}${searchQueryString}`,
    trustsHref: `${productPath}/trusts${searchQueryString}`,
  };
};

// Returns undefined unless the product belongs to the supplier and device type
// in the URL.
const getCategoryProductRoute = async (
  req: Request,
  { aggregationName }: AggregationKey,
): Promise<ProductRoute | undefined> => {
  const supplierInCategory = await getSupplierInCategory(req);

  if (
    !supplierInCategory?.devices.some(
      (device) => device.aggregationName === aggregationName,
    )
  ) {
    return undefined;
  }

  const { breadcrumbs, deviceTypePath, gmdnTerm, supplier, supplierPath } =
    supplierInCategory;
  const productHref = `${supplierPath}/product/${encodeURIComponent(aggregationName)}`;

  return {
    breadcrumbs: [
      ...breadcrumbs,
      { href: supplierPath, text: supplier.manOrganisationName },
    ],
    deviceType: gmdnTerm,
    deviceTypeHref: deviceTypePath,
    productHref,
    supplierHref: supplierPath,
    supplierName: supplier.manOrganisationName,
    trustsHref: `${productHref}/trusts`,
  };
};

// Links to the device type and supplier pages, which need a category in their
// URL. A product reached by search doesn't have one, so one is picked for it.
const getProductLinks = async (
  route: ProductRoute,
  { deviceId, manufacturerId }: { deviceId: number; manufacturerId: number },
) => {
  if (route.deviceTypeHref) {
    return {
      deviceTypeHref: route.deviceTypeHref,
      supplierHref: route.supplierHref,
    };
  }

  const browsePath = await getBrowsePathForDevice(deviceId);

  if (!browsePath) {
    return {};
  }

  const deviceTypeHref = `/category/${String(browsePath.categoryId)}/device-type/${String(browsePath.gmdnCode)}`;

  return {
    deviceTypeHref,
    supplierHref: `${deviceTypeHref}/supplier/${String(manufacturerId)}`,
  };
};

const renderProductPage = async (
  res: Response,
  { aggregationName, supplierId }: AggregationKey,
  route: ProductRoute,
) => {
  const aggregation = await getAggregationWithName(aggregationName, supplierId);

  if (!aggregation || aggregation.length === 0) {
    res.status(404).render("not-found");
    return;
  }

  const supplierName =
    route.supplierName ??
    (await getSupplierWithId(supplierId))?.manOrganisationName ??
    "";

  const deviceType =
    route.deviceType ?? (await getGmdnTermForDeviceId(aggregation[0].deviceId));

  const trustsWithExperienceCount =
    await getCountOfOrganisationsWithExperienceWithAggregation(
      aggregationName,
      supplierId,
    );
  const peopleWithExperienceCount =
    await getCountOfContactsWithExperienceWithAggregation(
      aggregationName,
      supplierId,
    );
  const procurementContractCount = await getContractCountForAggregation(
    aggregationName,
    supplierId,
  );
  const relevantDocuments = await getCountOfDocumentsByTypeForAggregation(
    aggregationName,
    supplierId,
  );

  const productAggregation: ProductAggregation = {
    aggregationName: aggregation[0].aggregationName ?? "",
    deviceType: deviceType,
    peopleWithExperienceCount: peopleWithExperienceCount,
    procurementContractCount: procurementContractCount,
    relevantDocuments: relevantDocuments,
    supplierName,
    trustsWithExperienceCount: trustsWithExperienceCount,
  };

  res.render("product", {
    ...(await getProductLinks(route, aggregation[0])),
    breadcrumbs: route.breadcrumbs,
    productAggregation,
    trustsHref: route.trustsHref,
  });
};

export const renderProduct = async (req: Request, res: Response) => {
  const key = getAggregationKeyFromParams(req);

  if (!key) {
    res.status(404).render("not-found");
    return;
  }

  await renderProductPage(res, key, getSearchProductRoute(req, key));
};

export const renderProductInCategory = async (req: Request, res: Response) => {
  const key = getAggregationKeyFromParams(req);
  const route = key && (await getCategoryProductRoute(req, key));

  if (!key || !route) {
    res.status(404).render("not-found");
    return;
  }

  await renderProductPage(res, key, route);
};

export const postMarkUseful = async (req: Request, res: Response) => {
  const result = postMarkUsefulSchema.safeParse(req.body);

  if (!result.success) {
    return res
      .status(400)
      .send("Aggregation name, supplier ID and evidence ID are required");
  }

  const { aggregationName, evidenceId, supplierId } = result.data;

  // Get the user ID from the session or request context
  const userId = req.user?.id;

  if (!userId) {
    // TODO: Send to better error handling page
    return res.status(500).send("Unable to determine user ID");
  }

  try {
    await db
      .withSchema("app")
      .insertInto("product_evidence_useful")
      .values({
        aggregationName,
        // @ts-expect-error: TypeScript may complain about the date format
        // Should be fixed when we switch from SQLite to Postgres
        dateMarkedUseful: new Date().toUTCString(),
        evidenceId: evidenceId,
        manufacturerId: supplierId,
        userId,
      })
      .execute();

    const countUseful = await db
      .withSchema("app")
      .selectFrom("product_evidence_useful")
      .select(db.fn.count("evidenceId").as("count"))
      .where("evidenceId", "=", evidenceId)
      .where("aggregationName", "=", aggregationName)
      .where("manufacturerId", "=", supplierId)
      .execute();

    // This gets type "string | number | bigint" for some reason
    const count = Number(countUseful[0].count);

    res.status(200).send({ count: count });
  } catch (error) {
    console.error("Failed to mark as useful", error);
    // TODO: Add proper error handling and logging here
    res.status(500).send("Failed to mark as useful");
  }
};

export const postUnmarkUseful = async (req: Request, res: Response) => {
  const result = postMarkUsefulSchema.safeParse(req.body);

  if (!result.success) {
    return res
      .status(400)
      .send("Aggregation name, supplier ID and evidence ID are required");
  }

  const { aggregationName, evidenceId, supplierId } = result.data;

  // Get the user ID from the session or request context
  const userId = req.user?.id;

  if (!userId) {
    // TODO: Send to better error handling page
    return res.status(500).send("Unable to determine user ID");
  }

  try {
    await db
      .withSchema("app")
      .deleteFrom("product_evidence_useful")
      .where("evidenceId", "=", evidenceId)
      .where("aggregationName", "=", aggregationName)
      .where("manufacturerId", "=", supplierId)
      .where("userId", "=", userId)
      .execute();

    const countUseful = await db
      .withSchema("app")
      .selectFrom("product_evidence_useful")
      .select(db.fn.count("evidenceId").as("count"))
      .where("aggregationName", "=", aggregationName)
      .where("manufacturerId", "=", supplierId)
      .where("evidenceId", "=", evidenceId)
      .execute();

    // This gets type "string | number | bigint" for some reason
    const count = Number(countUseful[0].count);

    res.status(200).send({ count: count });
  } catch (error) {
    console.error("Failed to unmark as useful", error);
    // TODO: Add proper error handling and logging here
    res.status(500).send("Failed to unmark as useful");
  }
};

export const renderAddEvidence = async (req: Request, res: Response) => {
  const productId = getProductIdFromParams(req);

  if (!productId) {
    // TODO: Send to better error handling page
    return res.status(400).send("Valid product ID is required");
  }

  try {
    const product = await getProductWithId(productId);

    if (!product) {
      // TODO: Send to better error handling page
      return res.status(404).send("Product not found");
    }

    const userId = req.user?.id;

    if (!userId) {
      // TODO: Send to better error handling page
      return res.status(500).send("Unable to determine user ID");
    }

    const organisation = await getUserOrganisation(userId);

    if (!organisation) {
      // TODO: Send to better error handling page
      return res.status(500).send("Unable to determine user's organisation");
    }

    res.render("product/add-evidence", {
      organisationName: organisation.organisationName,
      productId,
      productName: product.productName,
    });
  } catch (error) {
    console.error("Failed to render add evidence form", error);
    res.status(500).send("Failed to render add evidence form");
  }
};

export const postAddEvidence = async (req: Request, res: Response) => {
  const productId = getProductIdFromParams(req);

  if (!productId) {
    // TODO: Send to better error handling page
    return res.status(400).send("Valid product ID is required");
  }

  try {
    const product = await getProductWithId(productId);

    if (!product) {
      // TODO: Send to better error handling page
      return res.status(404).send("Product not found");
    }

    const userId = req.user?.id;

    if (!userId) {
      // TODO: Send to better error handling page
      return res.status(500).send("Unable to determine user ID");
    }

    const organisation = await getUserOrganisation(userId);

    if (!organisation) {
      // TODO: Send to better error handling page
      return res.status(500).send("Unable to determine user's organisation");
    }

    const evidenceId = await createEvidenceCardForOrganisation(
      organisation.organisationId,
      productId,
    );

    res.render("product/add-evidence-success", {
      evidenceId,
      organisationName: organisation.organisationName,
      productId,
      productName: product.productName,
    });
  } catch (error) {
    console.error("Failed to add evidence", error);
    res.status(500).send("Failed to add evidence");
  }
};

// export const renderAddEvidenceContactExperience = async (req: Request, res: Response) => {
//         const productId = getProductIdFromParams(req);

//         if (!productId) {
//           // TODO: Send to better error handling page
//           return res.status(400).send("Valid product ID is required");
//         }

//   res.render("product/add-evidence-contact-experience", { productId });
// };

// export const renderAddEvidenceContactAcquisition = async (req: Request, res: Response) => {
//   const productId = getProductIdFromParams(req);

//   if (!productId) {
//     // TODO: Send to better error handling page
//     return res.status(400).send("Valid product ID is required");
//   }

//   res.render("product/add-evidence-contact-acquisition", { productId });
// };

// export const renderAddEvidenceContactDocument = async (req: Request, res: Response) => {
//   const productId = getProductIdFromParams(req);

//   if (!productId) {
//     // TODO: Send to better error handling page
//     return res.status(400).send("Valid product ID is required");
//   }

//   res.render("product/add-evidence-contact-document", { productId });
// };

// export const postAddEvidenceContactDone = async (req: Request, res: Response) => {
//   const productId = getProductIdFromParams(req);

//   if (!productId) {
//     // TODO: Send to better error handling page
//     return res.status(400).send("Valid product ID is required");
//   }

//   // TODO: Implement the logic to handle the completion of adding evidence contact

//   res.render("product/add-evidence-contact-success", { productId });
// };

export const renderAddEvidenceContactSelf = async (
  req: Request,
  res: Response,
) => {
  const productId = getProductIdFromParams(req);

  if (!productId) {
    // TODO: Send to better error handling page
    return res.status(400).send("Valid product ID is required");
  }

  try {
    const product = await getProductWithId(productId);

    if (!product) {
      // TODO: Send to better error handling page
      return res.status(404).send("Product not found");
    }

    const userId = req.user?.id;

    if (!userId) {
      // TODO: Send to better error handling page
      return res.status(500).send("Unable to determine user ID");
    }

    const organisation = await getUserOrganisation(userId);

    if (!organisation) {
      // TODO: Send to better error handling page
      return res.status(500).send("Unable to determine organisation for user");
    }

    const contact = await getOrCreateContactForUser(userId);

    if (!contact) {
      // TODO: Send to better error handling page
      return res.status(500).send("Unable to determine contact for user");
    }

    res.render("product/add-evidence-contact-self", {
      contact,
      organisationName: organisation.organisationName,
      productId,
      productName: product.productName,
    });
  } catch (error) {
    console.error("Failed to render add evidence contact form", error);
    res.status(500).send("Failed to render add evidence contact form");
  }
};

export const postAddEvidenceContactSelf = async (
  req: Request,
  res: Response,
) => {
  const result = postAddEvidenceContactSelfSchema.safeParse(req.body);

  if (!result.success) {
    // TODO: Send to better error handling page
    return res.status(400).send("Invalid request body");
  }

  const contactId = result.data.contactId;

  const productId = getProductIdFromParams(req);

  if (!productId) {
    // TODO: Send to better error handling page
    return res.status(400).send("Valid product ID is required");
  }

  try {
    const product = await getProductWithId(productId);

    if (!product) {
      // TODO: Send to better error handling page
      return res.status(404).send("Product not found");
    }

    const userId = req.user?.id;

    if (!userId) {
      // TODO: Send to better error handling page
      return res.status(500).send("Unable to determine user ID");
    }

    const organisation = await getUserOrganisation(userId);

    if (!organisation) {
      // TODO: Send to better error handling page
      return res.status(500).send("Unable to determine organisation for user");
    }

    const evidenceCardId = await createEvidenceCardForOrganisation(
      organisation.organisationId,
      productId,
    );

    if (!evidenceCardId) {
      // TODO: Send to better error handling page
      return res
        .status(500)
        .send("Unable to create evidence card for organisation");
    }

    if (!contactId) {
      // TODO: Send to better error handling page
      return res.status(400).send("Valid contact ID is required");
    }

    const contact = await getContactForUser(userId);

    if (!contact) {
      // TODO: Send to better error handling page
      return res.status(500).send("Unable to determine contact for user");
    }

    const contactName =
      `${contact.title ?? ""} ${contact.givenName} ${contact.surname}`.trim();

    await linkContactToEvidence(contactId, evidenceCardId);

    res.render("product/add-evidence-contact-success", {
      contactName: contactName,
      organisationName: organisation.organisationName,
      productId,
      productName: product.productName,
    });
  } catch (error) {
    console.error("Failed to add evidence contact", error);
    res.status(500).send("Failed to add evidence contact");
  }
};

const renderProductTrustsPage = async (
  req: Request,
  res: Response,
  { aggregationName, supplierId }: AggregationKey,
  route: ProductRoute,
) => {
  const aggregation = await getAggregationWithName(aggregationName, supplierId);

  if (!aggregation || aggregation.length === 0) {
    res.status(404).render("not-found");
    return;
  }

  const supplierName =
    route.supplierName ??
    (await getSupplierWithId(supplierId))?.manOrganisationName ??
    "";
  const evidenceCards = await getEvidenceCardsForAggregation(
    aggregationName,
    supplierId,
    req.user?.id,
  );

  const viewModel: ProductTrusts = {
    aggregationName: aggregation[0].aggregationName ?? "",
    evidenceCards: evidenceCards,
    supplierId,
    supplierName,
  };

  res.render("product/trusts", {
    ...viewModel,
    breadcrumbs: [
      ...route.breadcrumbs,
      { href: route.productHref, text: viewModel.aggregationName },
    ],
    productHref: route.productHref,
  });
};

export const renderProductTrusts = async (req: Request, res: Response) => {
  const key = getAggregationKeyFromParams(req);

  if (!key) {
    res.status(404).render("not-found");
    return;
  }

  await renderProductTrustsPage(req, res, key, getSearchProductRoute(req, key));
};

export const renderProductTrustsInCategory = async (
  req: Request,
  res: Response,
) => {
  const key = getAggregationKeyFromParams(req);
  const route = key && (await getCategoryProductRoute(req, key));

  if (!key || !route) {
    res.status(404).render("not-found");
    return;
  }

  await renderProductTrustsPage(req, res, key, route);
};

export const renderProductRelatedTrusts = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  req: Request,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  res: Response,
) => {
  await new Promise((resolve) => {
    console.log("temp async to make linter happy");
    resolve("");
  });
  throw new Error("Not implemented yet");
};

async function createEvidenceCardForOrganisation(
  organisationId: number,
  productId: number,
): Promise<number> {
  const genericEvidenceType = 8;

  // Evidence is linked to the product's aggregation rather than the product itself
  const aggregation = await getAggregationForProductId(productId);

  if (!aggregation) {
    throw new Error(`No aggregation found for product ID ${String(productId)}`);
  }

  const trx = await db.startTransaction().execute();

  try {
    const evidence = await trx
      .withSchema("app")
      .insertInto("evidence")
      .values({
        organisationId,
        typeOfEvidenceId: genericEvidenceType,
      })
      .returning("evidenceId")
      .executeTakeFirstOrThrow();

    await trx
      .withSchema("app")
      .insertInto("product_evidence")
      .values({
        aggregationName: aggregation.aggregationName,
        evidenceId: evidence.evidenceId,
        manufacturerId: aggregation.manufacturerId,
      })
      .executeTakeFirstOrThrow();

    await trx.commit().execute();
    return evidence.evidenceId;
  } catch (error) {
    await trx.rollback().execute();
    throw error;
  }
}

async function getContactForUser(userId: number): Promise<Contact | null> {
  const contact = await db
    .withSchema("app")
    .selectFrom("contacts")
    .selectAll()
    .where("userId", "=", userId)
    .executeTakeFirst();
  return contact ?? null;
}

async function getOrCreateContactForUser(
  userId: number,
): Promise<Contact | null> {
  const contact = await getContactForUser(userId);

  if (!contact) {
    const user = await db
      .withSchema("app")
      .selectFrom("users")
      .selectAll()
      .where("id", "=", userId)
      .executeTakeFirst();

    if (!user) {
      throw new Error("Unable to determine user for creating contact");
    }

    const newContact = await db
      .withSchema("app")
      .insertInto("contacts")
      .values({
        email: user.username,
        givenName: user.givenName,
        phoneNo: null,
        role: "TODO: Role",
        surname: user.lastName,
        title: null,
        userId: userId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return newContact;
  }

  return contact;
}

function getProductIdFromParams(req: Request): null | number {
  try {
    const productId = parseInt(req.params.productId as string);
    return isNaN(productId) ? null : productId;
  } catch {
    return null;
  }
}

// NOTE: This assumes that the user only belongs to a single organisation
// We know this probably won't hold true for all users, but it's a reasonable assumption for now that we can fix later
async function getUserOrganisation(
  userId: number,
): Promise<null | Organisations> {
  const organisation = await db
    .withSchema("app")
    .selectFrom("organisations")
    .selectAll()
    .innerJoin(
      "organisation_user",
      "organisations.organisationId",
      "organisation_user.organisationId",
    )
    .where("organisation_user.userId", "=", userId)
    .executeTakeFirst();
  return organisation ?? null;
}

async function linkContactToEvidence(
  contactId: number,
  evidenceId: number,
): Promise<void> {
  await db
    .withSchema("app")
    .insertInto("evidence_contacts")
    .values({
      contactId,
      discussBusinessCase: false,
      discussEhrIntegration: false,
      discussImplementation: false,
      discussOutcomes: false,
      discussPharmacyIntegration: false,
      discussRealWorldUse: false,
      discussTraining: false,
      evidenceId,
    })
    .executeTakeFirstOrThrow();
}
