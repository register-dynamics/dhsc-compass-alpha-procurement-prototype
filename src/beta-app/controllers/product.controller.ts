import { Request, Response } from "express";

import { db } from "../database/client.js";
import { Contact, Organisations } from "../database/types.js";
import { postAddEvidenceContactSelfSchema } from "../models/request-schemas/postAddEvidenceContactSelfSchema.js";
import { postMarkUsefulSchema } from "../models/request-schemas/postMarkUsefulSchema.js";
import { Breadcrumb } from "../models/view-models/breadcrumb.js";
import { getContractDetails } from "../models/view-models/contractDetails.js";
import { ProductAggregation } from "../models/view-models/productAggregation.js";
import { ProductTrusts } from "../models/view-models/productTrusts.js";
import { getRelatedContractsTable } from "../models/view-models/relatedContractsTable.js";
import {
  getContractsForTrustAndProduct,
  getContractWithRef,
} from "../services/atamisService.js";
import {
  getAggregationForProductId,
  getAggregationWithName,
  getEvidenceCardsForProduct,
  getProductWithId,
  getTrustExperienceForAggregation,
} from "../services/productsService.js";
import {
  getProductRelatedContracts,
  getProductTrustData,
  ProductScope,
} from "../services/trustDataService.js";
import {
  getSupplierInCategory,
  getSupplierInSearch,
} from "./deviceType.controller.js";

// An aggregation is identified by its name and supplier, as different
// suppliers can use the same aggregation name for unrelated products. It can
// span several device types (GMDN terms), so a product page is for its
// products of the device type in the URL.
interface ProductKey {
  aggregationName: string;
  gmdnCode: number;
  supplierId: number;
}

// What differs between reaching a product by search and by browsing
interface ProductRoute {
  breadcrumbs: Breadcrumb[];
  deviceType: string;
  deviceTypeHref?: string;
  // 1 trust's experience of the product
  getTrustHref: (organisationId: number) => string;
  productHref: string;
  relatedTrustsHref: string;
  // relatedTrustsHref without the search query string. Its contracts' pages
  // are beneath it.
  relatedTrustsPath: string;
  // The search the product was reached from, to keep on every link
  searchQueryString: string;
  supplierHref?: string;
  supplierName: string;
  trustsHref: string;
}

type SupplierPage =
  | Awaited<ReturnType<typeof getSupplierInCategory>>
  | Awaited<ReturnType<typeof getSupplierInSearch>>;

// Returns undefined if the URL doesn't name an aggregation, device type and
// supplier
const getProductKeyFromParams = (req: Request): ProductKey | undefined => {
  const aggregationName = req.params.aggregationName as string | undefined;
  const gmdnCode = Number(req.params.deviceTypeId);
  const supplierId = Number(req.params.supplierId);

  if (
    !aggregationName ||
    !Number.isInteger(gmdnCode) ||
    !Number.isInteger(supplierId)
  ) {
    return undefined;
  }

  return { aggregationName, gmdnCode, supplierId };
};

const toProductScope = ({
  aggregationName,
  gmdnCode,
  supplierId,
}: ProductKey): ProductScope => ({
  aggregationName,
  gmdnCode,
  manufacturerId: supplierId,
});

// A product page sits beneath the supplier page for its device type, wherever
// that was reached from. Returns undefined unless the aggregation is one of
// the supplier's devices of that type.
const getProductRoute = (
  supplierPage: SupplierPage,
  { aggregationName }: ProductKey,
  supplierHref: string | undefined,
): ProductRoute | undefined => {
  if (
    !supplierPage?.devices.some(
      (device) => device.aggregationName === aggregationName,
    )
  ) {
    return undefined;
  }

  const { breadcrumbs, searchQueryString, supplier, supplierPath } =
    supplierPage;
  const productPath = `${supplierPath}/product/${encodeURIComponent(aggregationName)}`;
  const relatedTrustsPath = `${productPath}/related-trusts`;

  return {
    breadcrumbs: [
      ...breadcrumbs,
      {
        href: `${supplierPath}${searchQueryString}`,
        text: supplier.manOrganisationName,
      },
    ],
    deviceType: supplierPage.gmdnTerm,
    deviceTypeHref: supplierPage.deviceTypePath,
    getTrustHref: (organisationId) =>
      `${productPath}/trust/${String(organisationId)}${searchQueryString}`,
    productHref: `${productPath}${searchQueryString}`,
    relatedTrustsHref: `${relatedTrustsPath}${searchQueryString}`,
    relatedTrustsPath,
    searchQueryString,
    supplierHref,
    supplierName: supplier.manOrganisationName,
    trustsHref: `${productPath}/trusts${searchQueryString}`,
  };
};

// The breadcrumbs lead back to the search. The device type and supplier
// links need a category in their URL, so they use one picked for the device
// type.
const getSearchProductRoute = async (req: Request, key: ProductKey) => {
  const supplierPage = await getSupplierInSearch(req);
  const supplierHref =
    supplierPage?.deviceTypePath &&
    `${supplierPage.deviceTypePath}/supplier/${String(key.supplierId)}`;

  return getProductRoute(supplierPage, key, supplierHref);
};

const getCategoryProductRoute = async (req: Request, key: ProductKey) => {
  const supplierPage = await getSupplierInCategory(req);

  return getProductRoute(supplierPage, key, supplierPage?.supplierPath);
};

// Returns undefined, having rendered a 404, if the URL isn't for a product
const getProductFromRequest = async (
  req: Request,
  res: Response,
  getRoute: (
    req: Request,
    key: ProductKey,
  ) => Promise<ProductRoute | undefined>,
) => {
  const key = getProductKeyFromParams(req);
  const route = key && (await getRoute(req, key));
  const aggregation =
    key &&
    route &&
    (await getAggregationWithName(
      key.aggregationName,
      key.supplierId,
      key.gmdnCode,
    ));

  if (!key || !route || !aggregation || aggregation.length === 0) {
    res.status(404).render("not-found");
    return undefined;
  }

  return { key, route };
};

const renderProductPage = async (
  res: Response,
  key: ProductKey,
  route: ProductRoute,
) => {
  const trustData = await getProductTrustData(toProductScope(key));

  const productAggregation: ProductAggregation = {
    aggregationName: key.aggregationName,
    deviceType: route.deviceType,
    relatedTrustData: trustData.related,
    supplierName: route.supplierName,
    trustData: trustData.exact,
  };

  res.render("product", {
    breadcrumbs: route.breadcrumbs,
    deviceTypeHref: route.deviceTypeHref,
    productAggregation,
    relatedTrustsHref: route.relatedTrustsHref,
    supplierHref: route.supplierHref,
    trustsHref: route.trustsHref,
  });
};

export const renderProduct = async (req: Request, res: Response) => {
  const product = await getProductFromRequest(req, res, getSearchProductRoute);

  if (product) {
    await renderProductPage(res, product.key, product.route);
  }
};

export const renderProductInCategory = async (req: Request, res: Response) => {
  const product = await getProductFromRequest(
    req,
    res,
    getCategoryProductRoute,
  );

  if (product) {
    await renderProductPage(res, product.key, product.route);
  }
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
        evidenceId: evidenceId,
        manufacturerId: supplierId,
        userId,
      })
      .execute();

    const countUseful = await db
      .withSchema("app")
      .selectFrom("product_evidence_useful")
      .select(db.fn.count<string>("evidenceId").as("count"))
      .where("evidenceId", "=", evidenceId)
      .where("aggregationName", "=", aggregationName)
      .where("manufacturerId", "=", supplierId)
      .execute();

    // Postgres returns count() as a bigint, which pg gives as a string
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
      .select(db.fn.count<string>("evidenceId").as("count"))
      .where("aggregationName", "=", aggregationName)
      .where("manufacturerId", "=", supplierId)
      .where("evidenceId", "=", evidenceId)
      .execute();

    // Postgres returns count() as a bigint, which pg gives as a string
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
  key: ProductKey,
  route: ProductRoute,
) => {
  const evidenceCards = await getEvidenceCardsForProduct(
    toProductScope(key),
    req.user?.id,
  );

  const viewModel: ProductTrusts = {
    aggregationName: key.aggregationName,
    evidenceCards: evidenceCards.map((evidenceCard) => ({
      ...evidenceCard,
      href:
        evidenceCard.organisationId === null
          ? null
          : route.getTrustHref(evidenceCard.organisationId),
    })),
    supplierId: key.supplierId,
    supplierName: route.supplierName,
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
  const product = await getProductFromRequest(req, res, getSearchProductRoute);

  if (product) {
    await renderProductTrustsPage(req, res, product.key, product.route);
  }
};

export const renderProductTrustsInCategory = async (
  req: Request,
  res: Response,
) => {
  const product = await getProductFromRequest(
    req,
    res,
    getCategoryProductRoute,
  );

  if (product) {
    await renderProductTrustsPage(req, res, product.key, product.route);
  }
};

// The contracts counted on the product page's related card
const renderProductRelatedTrustsPage = async (
  req: Request,
  res: Response,
  key: ProductKey,
  route: ProductRoute,
) => {
  const contracts = await getProductRelatedContracts(toProductScope(key));

  res.render("product/related-trusts", {
    aggregationName: key.aggregationName,
    breadcrumbs: [
      ...route.breadcrumbs,
      { href: route.productHref, text: key.aggregationName },
    ],
    contractsTable: getRelatedContractsTable(
      contracts,
      req.query,
      route.searchQueryString,
      route.relatedTrustsPath,
    ),
    productHref: route.productHref,
    supplierName: route.supplierName,
  });
};

// 1 of the contracts listed on the related trusts page. Any other contract
// is a 404, so the page can't be used to look up contracts it doesn't list.
const renderProductRelatedContractPage = async (
  req: Request,
  res: Response,
  key: ProductKey,
  route: ProductRoute,
) => {
  const contractRef = req.params.contractId as string;
  const isRelated = (
    await getProductRelatedContracts(toProductScope(key))
  ).some((contract) => contract.contractRef === contractRef);
  const contract = isRelated && (await getContractWithRef(contractRef));

  if (!contract) {
    res.status(404).render("not-found");
    return;
  }

  res.render("contract", {
    breadcrumbs: [
      ...route.breadcrumbs,
      { href: route.productHref, text: key.aggregationName },
      {
        href: route.relatedTrustsHref,
        text: "Contracts in the same or related categories",
      },
    ],
    contract: getContractDetails(contract),
  });
};

export const renderProductRelatedContract = async (
  req: Request,
  res: Response,
) => {
  const product = await getProductFromRequest(req, res, getSearchProductRoute);

  if (product) {
    await renderProductRelatedContractPage(
      req,
      res,
      product.key,
      product.route,
    );
  }
};

export const renderProductRelatedContractInCategory = async (
  req: Request,
  res: Response,
) => {
  const product = await getProductFromRequest(
    req,
    res,
    getCategoryProductRoute,
  );

  if (product) {
    await renderProductRelatedContractPage(
      req,
      res,
      product.key,
      product.route,
    );
  }
};

export const renderProductRelatedTrusts = async (
  req: Request,
  res: Response,
) => {
  const product = await getProductFromRequest(req, res, getSearchProductRoute);

  if (product) {
    await renderProductRelatedTrustsPage(req, res, product.key, product.route);
  }
};

export const renderProductRelatedTrustsInCategory = async (
  req: Request,
  res: Response,
) => {
  const product = await getProductFromRequest(
    req,
    res,
    getCategoryProductRoute,
  );

  if (product) {
    await renderProductRelatedTrustsPage(req, res, product.key, product.route);
  }
};

const renderProductTrustExperiencePage = async (
  req: Request,
  res: Response,
  key: ProductKey,
  route: ProductRoute,
) => {
  const organisationId = Number(req.params.trustId);
  const trustExperience =
    Number.isInteger(organisationId) &&
    (await getTrustExperienceForAggregation(
      key.aggregationName,
      key.supplierId,
      organisationId,
      req.user?.id,
    ));

  if (!trustExperience) {
    res.status(404).render("not-found");
    return;
  }

  const contracts = await getContractsForTrustAndProduct(
    toProductScope(key),
    trustExperience.organisationName,
  );

  res.render("product/trust", {
    aggregationName: key.aggregationName,
    breadcrumbs: [
      ...route.breadcrumbs,
      { href: route.productHref, text: key.aggregationName },
      {
        href: route.trustsHref,
        text: "Trusts sharing experience with this device",
      },
    ],
    contracts,
    supplierId: key.supplierId,
    supplierName: route.supplierName,
    trustExperience,
  });
};

export const renderProductTrustExperience = async (
  req: Request,
  res: Response,
) => {
  const product = await getProductFromRequest(req, res, getSearchProductRoute);

  if (product) {
    await renderProductTrustExperiencePage(
      req,
      res,
      product.key,
      product.route,
    );
  }
};

export const renderProductTrustExperienceInCategory = async (
  req: Request,
  res: Response,
) => {
  const product = await getProductFromRequest(
    req,
    res,
    getCategoryProductRoute,
  );

  if (product) {
    await renderProductTrustExperiencePage(
      req,
      res,
      product.key,
      product.route,
    );
  }
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
