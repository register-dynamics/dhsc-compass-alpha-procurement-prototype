import { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  postAddEvidence,
  postAddEvidenceContactSelf,
  postMarkUseful,
  postUnmarkUseful,
  renderAddEvidence,
  renderAddEvidenceContactSelf,
  renderProduct,
  renderProductInCategory,
  renderProductTrustExperience,
} from "./product.controller.js";

const {
  countMock,
  deleteFromMock,
  insertIntoMock,
  maxMock,
  selectFromMock,
  startTransactionMock,
} = vi.hoisted(() => ({
  countMock: vi.fn(),
  deleteFromMock: vi.fn(),
  insertIntoMock: vi.fn(),
  maxMock: vi.fn(),
  selectFromMock: vi.fn(),
  startTransactionMock: vi.fn(),
}));

vi.mock("../database/client.js", () => ({
  db: {
    deleteFrom: deleteFromMock,
    fn: {
      count: countMock,
      max: maxMock,
    },
    insertInto: insertIntoMock,
    selectFrom: selectFromMock,
    startTransaction: startTransactionMock,
    withSchema: vi.fn().mockReturnThis(),
  },
}));

const {
  getAggregationForProductIdMock,
  getAggregationWithNameMock,
  getContractsForTrustAndProductMock,
  getProductTrustDataMock,
  getSupplierInCategoryMock,
  getSupplierInSearchMock,
  getTrustExperienceForAggregationMock,
} = vi.hoisted(() => ({
  getAggregationForProductIdMock: vi.fn(),
  getAggregationWithNameMock: vi.fn(),
  getContractsForTrustAndProductMock: vi.fn(),
  getProductTrustDataMock: vi.fn(),
  getSupplierInCategoryMock: vi.fn(),
  getSupplierInSearchMock: vi.fn(),
  getTrustExperienceForAggregationMock: vi.fn(),
}));

vi.mock("../services/productsService.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/productsService.js")>()),
  getAggregationForProductId: getAggregationForProductIdMock,
  getAggregationWithName: getAggregationWithNameMock,
  getTrustExperienceForAggregation: getTrustExperienceForAggregationMock,
}));

vi.mock("../services/atamisService.js", () => ({
  getContractsForTrustAndProduct: getContractsForTrustAndProductMock,
}));

vi.mock("../services/trustDataService.js", () => ({
  getProductTrustData: getProductTrustDataMock,
}));

vi.mock("./deviceType.controller.js", () => ({
  getSupplierInCategory: getSupplierInCategoryMock,
  getSupplierInSearch: getSupplierInSearchMock,
}));

// The supplier page for device type 40 from supplier 3, reached from search
const supplierPage = (overrides: Record<string, unknown> = {}) => ({
  breadcrumbs: [
    { href: "/", text: "Home" },
    { href: "/search", text: "Search" },
  ],
  devices: [{ aggregationName: "Pump", href: "", trustCount: 0 }],
  deviceTypeId: 40,
  deviceTypePath: "/category/7/device-type/40",
  gmdnTerm: "Infusion pump",
  searchQueryString: "",
  supplier: { manOrganisationName: "Acme Medical", manufacturerId: 3 },
  supplierPath: "/device-type/40/supplier/3",
  ...overrides,
});

const productParams = {
  aggregationName: "Pump",
  deviceTypeId: "40",
  supplierId: "3",
};

const notFound = () => {
  const render = vi.fn();
  const status = vi.fn().mockReturnValue({ render });
  return { render, res: { status } as unknown as Response, status };
};

describe("Product controller", () => {
  beforeEach(() => {
    countMock.mockReset();
    deleteFromMock.mockReset();
    insertIntoMock.mockReset();
    maxMock.mockReset();
    selectFromMock.mockReset();
    startTransactionMock.mockReset();
    getAggregationWithNameMock.mockReset();
    getProductTrustDataMock.mockReset();
    getSupplierInCategoryMock.mockReset();
    getSupplierInSearchMock.mockReset();
    getTrustExperienceForAggregationMock.mockReset();
    getContractsForTrustAndProductMock.mockReset();

    getAggregationForProductIdMock.mockReset();
    getAggregationForProductIdMock.mockResolvedValue({
      aggregationName: "Pump",
      manufacturerId: 3,
    });

    countMock.mockReturnValue({
      as: vi.fn().mockReturnValue("totalUsefulCount"),
    });
    maxMock.mockReturnValue({
      as: vi.fn().mockReturnValue("hasUserMarkedUseful"),
    });
  });

  it.each([
    ["the aggregation name is missing", { aggregationName: undefined }],
    ["the supplier ID is invalid", { supplierId: "abc" }],
    ["the device type ID is invalid", { deviceTypeId: "abc" }],
  ])(
    "GET /device-type/:deviceTypeId/supplier/:supplierId/product/:aggregationName returns 404 when %s",
    async (_, params) => {
      const { render, res, status } = notFound();

      await renderProduct(
        {
          params: { ...productParams, ...params },
          query: {},
        } as unknown as Request,
        res,
      );

      expect(status).toHaveBeenCalledWith(404);
      expect(render).toHaveBeenCalledWith("not-found");
      expect(getSupplierInSearchMock).not.toHaveBeenCalled();
      expect(getAggregationWithNameMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["the supplier page doesn't exist", undefined],
    [
      "the aggregation isn't one of the supplier's devices of the type",
      supplierPage({
        devices: [{ aggregationName: "Other", href: "", trustCount: 0 }],
      }),
    ],
  ])(
    "GET /device-type/:deviceTypeId/supplier/:supplierId/product/:aggregationName returns 404 when %s",
    async (_, page) => {
      getSupplierInSearchMock.mockResolvedValue(page);
      const { render, res, status } = notFound();

      await renderProduct(
        { params: productParams, query: {} } as unknown as Request,
        res,
      );

      expect(status).toHaveBeenCalledWith(404);
      expect(render).toHaveBeenCalledWith("not-found");
      expect(getAggregationWithNameMock).not.toHaveBeenCalled();
    },
  );

  it("GET /device-type/:deviceTypeId/supplier/:supplierId/product/:aggregationName returns 404 when the aggregation has no products of the type", async () => {
    getSupplierInSearchMock.mockResolvedValue(supplierPage());
    getAggregationWithNameMock.mockResolvedValue([]);
    const { render, res, status } = notFound();

    await renderProduct(
      { params: productParams, query: {} } as unknown as Request,
      res,
    );

    expect(getAggregationWithNameMock).toHaveBeenCalledWith("Pump", 3, 40);
    expect(status).toHaveBeenCalledWith(404);
    expect(render).toHaveBeenCalledWith("not-found");
    expect(getProductTrustDataMock).not.toHaveBeenCalled();
  });

  it("GET /device-type/:deviceTypeId/supplier/:supplierId/product/:aggregationName renders the product for the device type in the URL", async () => {
    const trustData = {
      contractCount: 2,
      documentCounts: [{ count: 2, documentType: "Business case" }],
      peopleCount: 7,
      trustCount: 4,
    };
    const relatedTrustData = {
      contractCount: 5,
      documentCounts: [],
      peopleCount: 3,
      trustCount: 6,
    };
    getSupplierInSearchMock.mockResolvedValue(
      supplierPage({
        breadcrumbs: [
          { href: "/", text: "Home" },
          { href: "/search-results?q=pump", text: "Search results" },
        ],
        searchQueryString: "?q=pump",
      }),
    );
    getAggregationWithNameMock.mockResolvedValue([
      { aggregationName: "Pump", deviceId: 5, manufacturerId: 3 },
    ]);
    getProductTrustDataMock.mockResolvedValue({
      exact: trustData,
      related: relatedTrustData,
    });

    const render = vi.fn();
    await renderProduct(
      { params: productParams, query: { q: "pump" } } as unknown as Request,
      { render } as unknown as Response,
    );

    expect(getProductTrustDataMock).toHaveBeenCalledWith({
      aggregationName: "Pump",
      gmdnCode: 40,
      manufacturerId: 3,
    });
    expect(render).toHaveBeenCalledWith("product", {
      breadcrumbs: [
        { href: "/", text: "Home" },
        { href: "/search-results?q=pump", text: "Search results" },
        { href: "/device-type/40/supplier/3?q=pump", text: "Acme Medical" },
      ],
      deviceTypeHref: "/category/7/device-type/40",
      productAggregation: {
        aggregationName: "Pump",
        deviceType: "Infusion pump",
        relatedTrustData,
        supplierName: "Acme Medical",
        trustData,
      },
      relatedTrustsHref:
        "/device-type/40/supplier/3/product/Pump/related-trusts?q=pump",
      supplierHref: "/category/7/device-type/40/supplier/3",
      trustsHref: "/device-type/40/supplier/3/product/Pump/trusts?q=pump",
    });
  });

  it("GET /category/:categoryId/device-type/:deviceTypeId/supplier/:supplierId/product/:aggregationName links within its own path", async () => {
    const emptyTrustData = {
      contractCount: 0,
      documentCounts: [],
      peopleCount: 0,
      trustCount: 0,
    };
    getSupplierInCategoryMock.mockResolvedValue(
      supplierPage({ supplierPath: "/category/7/device-type/40/supplier/3" }),
    );
    getAggregationWithNameMock.mockResolvedValue([
      { aggregationName: "Pump", deviceId: 5, manufacturerId: 3 },
    ]);
    getProductTrustDataMock.mockResolvedValue({
      exact: emptyTrustData,
      related: emptyTrustData,
    });

    const render = vi.fn();
    await renderProductInCategory(
      {
        params: { ...productParams, categoryId: "7" },
        query: {},
      } as unknown as Request,
      { render } as unknown as Response,
    );

    expect(getSupplierInSearchMock).not.toHaveBeenCalled();
    expect(render).toHaveBeenCalledWith(
      "product",
      expect.objectContaining({
        deviceTypeHref: "/category/7/device-type/40",
        supplierHref: "/category/7/device-type/40/supplier/3",
        trustsHref: "/category/7/device-type/40/supplier/3/product/Pump/trusts",
      }),
    );
  });

  it("GET /device-type/:deviceTypeId/supplier/:supplierId/product/:aggregationName/trust/:trustId returns 404 when the trust ID is invalid", async () => {
    getSupplierInSearchMock.mockResolvedValue(supplierPage());
    getAggregationWithNameMock.mockResolvedValue([
      { aggregationName: "Pump", deviceId: 5, manufacturerId: 3 },
    ]);
    const { render, res, status } = notFound();

    await renderProductTrustExperience(
      {
        params: { ...productParams, trustId: "abc" },
        query: {},
      } as unknown as Request,
      res,
    );

    expect(status).toHaveBeenCalledWith(404);
    expect(render).toHaveBeenCalledWith("not-found");
    expect(getTrustExperienceForAggregationMock).not.toHaveBeenCalled();
  });

  it("GET /device-type/:deviceTypeId/supplier/:supplierId/product/:aggregationName/trust/:trustId returns 404 when the trust is not found", async () => {
    getSupplierInSearchMock.mockResolvedValue(supplierPage());
    getAggregationWithNameMock.mockResolvedValue([
      { aggregationName: "Pump", deviceId: 5, manufacturerId: 3 },
    ]);
    getTrustExperienceForAggregationMock.mockResolvedValue(undefined);
    const { render, res, status } = notFound();

    await renderProductTrustExperience(
      {
        params: { ...productParams, trustId: "99" },
        query: {},
      } as unknown as Request,
      res,
    );

    expect(getTrustExperienceForAggregationMock).toHaveBeenCalledWith(
      "Pump",
      3,
      99,
      undefined,
    );
    expect(status).toHaveBeenCalledWith(404);
    expect(render).toHaveBeenCalledWith("not-found");
  });

  it("GET /device-type/:deviceTypeId/supplier/:supplierId/product/:aggregationName/trust/:trustId renders the trust's experience with breadcrumbs", async () => {
    const trustExperience = {
      organisationId: 7,
      organisationName: "Barts Health NHS Trust",
      people: [],
      procured: true,
    };
    const contracts = [
      {
        businessUnit: "Diabetes",
        contractName: "Insulin pumps",
        contractRef: "C1",
        owner: "Daniel Okoro",
        procurementDeliveryLead: "Alice Smith",
      },
    ];
    getSupplierInSearchMock.mockResolvedValue(supplierPage());
    getAggregationWithNameMock.mockResolvedValue([
      { aggregationName: "Pump", deviceId: 5, manufacturerId: 3 },
    ]);
    getTrustExperienceForAggregationMock.mockResolvedValue(trustExperience);
    getContractsForTrustAndProductMock.mockResolvedValue(contracts);

    const render = vi.fn();
    await renderProductTrustExperience(
      {
        params: { ...productParams, trustId: "7" },
        query: {},
        user: { id: 12 },
      } as unknown as Request,
      { render } as unknown as Response,
    );

    expect(getContractsForTrustAndProductMock).toHaveBeenCalledWith(
      { aggregationName: "Pump", gmdnCode: 40, manufacturerId: 3 },
      "Barts Health NHS Trust",
    );
    expect(render).toHaveBeenCalledWith("product/trust", {
      aggregationName: "Pump",
      breadcrumbs: [
        { href: "/", text: "Home" },
        { href: "/search", text: "Search" },
        { href: "/device-type/40/supplier/3", text: "Acme Medical" },
        { href: "/device-type/40/supplier/3/product/Pump", text: "Pump" },
        {
          href: "/device-type/40/supplier/3/product/Pump/trusts",
          text: "Trusts sharing experience with this device",
        },
      ],
      contracts,
      supplierId: 3,
      supplierName: "Acme Medical",
      trustExperience,
    });
  });

  it("GET /product/mark-useful should mark evidence as useful", async () => {
    const insertQuery = {
      execute: vi.fn().mockResolvedValue(undefined),
      values: vi.fn().mockReturnThis(),
    };
    const countQuery = {
      execute: vi.fn().mockResolvedValue([{ count: 4 }]),
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    insertIntoMock.mockReturnValue(insertQuery);
    selectFromMock.mockReturnValue(countQuery);
    countMock.mockReturnValue({ as: vi.fn().mockReturnValue("count") });

    const status = vi.fn().mockReturnThis();
    const send = vi.fn();
    await postMarkUseful(
      {
        body: { aggregationName: "Pump", evidenceId: "12", supplierId: "3" },
        user: { id: 56 },
      } as unknown as Request,
      { send, status } as unknown as Response,
    );

    expect(insertIntoMock).toHaveBeenCalledWith("product_evidence_useful");
    expect(insertQuery.values).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregationName: "Pump",
        evidenceId: 12,
        manufacturerId: 3,
        userId: 56,
      }),
    );
    expect(status).toHaveBeenCalledWith(200);
    expect(send).toHaveBeenCalledWith({ count: 4 });
  });

  it("GET /product/unmark-useful should unmark evidence as useful", async () => {
    const deleteQuery = {
      execute: vi.fn().mockResolvedValue(undefined),
      where: vi.fn().mockReturnThis(),
    };
    const countQuery = {
      execute: vi.fn().mockResolvedValue([{ count: 2 }]),
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    deleteFromMock.mockReturnValue(deleteQuery);
    selectFromMock.mockReturnValue(countQuery);
    countMock.mockReturnValue({ as: vi.fn().mockReturnValue("count") });

    const status = vi.fn().mockReturnThis();
    const send = vi.fn();
    await postUnmarkUseful(
      {
        body: { aggregationName: "Pump", evidenceId: 12, supplierId: 3 },
        user: { id: 56 },
      } as unknown as Request,
      { send, status } as unknown as Response,
    );

    expect(deleteFromMock).toHaveBeenCalledWith("product_evidence_useful");
    expect(deleteQuery.where).toHaveBeenNthCalledWith(1, "evidenceId", "=", 12);
    expect(deleteQuery.where).toHaveBeenNthCalledWith(
      2,
      "aggregationName",
      "=",
      "Pump",
    );
    expect(deleteQuery.where).toHaveBeenNthCalledWith(
      3,
      "manufacturerId",
      "=",
      3,
    );
    expect(deleteQuery.where).toHaveBeenNthCalledWith(4, "userId", "=", 56);
    expect(status).toHaveBeenCalledWith(200);
    expect(send).toHaveBeenCalledWith({ count: 2 });
  });

  it("GET /product/mark-useful should return 400 if the supplier ID is missing", async () => {
    const status = vi.fn().mockReturnThis();
    const send = vi.fn();
    await postMarkUseful(
      {
        body: { aggregationName: "Pump", evidenceId: 1 },
        user: { id: 1 },
      } as unknown as Request,
      { send, status } as unknown as Response,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(insertIntoMock).not.toHaveBeenCalled();
  });

  it("GET /product/mark-useful should return 400 if parameters are missing", async () => {
    const status = vi.fn().mockReturnThis();
    const send = vi.fn();
    await postMarkUseful(
      { body: {}, user: { id: 1 } } as unknown as Request,
      { send, status } as unknown as Response,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith(
      "Aggregation name, supplier ID and evidence ID are required",
    );
  });

  it("GET /product/mark-useful should return 500 if user cannot be retrieved", async () => {
    const status = vi.fn().mockReturnThis();
    const send = vi.fn();
    await postMarkUseful(
      {
        body: { aggregationName: "Pump", evidenceId: 1, supplierId: 3 },
      } as unknown as Request,
      { send, status } as unknown as Response,
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith("Unable to determine user ID");
  });

  it("GET /product/mark-useful should return 500 if the database operation fails", async () => {
    insertIntoMock.mockReturnValue({
      execute: vi.fn().mockRejectedValue(new Error("insert failed")),
      values: vi.fn().mockReturnThis(),
    });
    const status = vi.fn().mockReturnThis();
    const send = vi.fn();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await postMarkUseful(
      {
        body: { aggregationName: "Pump", evidenceId: 1, supplierId: 3 },
        user: { id: 3 },
      } as unknown as Request,
      { send, status } as unknown as Response,
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith("Failed to mark as useful");
    consoleError.mockRestore();
  });

  it("GET /product/unmark-useful should return 400 if parameters are missing", async () => {
    const status = vi.fn().mockReturnThis();
    const send = vi.fn();
    await postUnmarkUseful(
      { body: { aggregationName: "Pump" } } as unknown as Request,
      { send, status } as unknown as Response,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith(
      "Aggregation name, supplier ID and evidence ID are required",
    );
  });

  it("GET /product/unmark-useful should return 500 if user cannot be retrieved", async () => {
    const status = vi.fn().mockReturnThis();
    const send = vi.fn();
    await postUnmarkUseful(
      {
        body: { aggregationName: "Pump", evidenceId: 1, supplierId: 3 },
      } as unknown as Request,
      { send, status } as unknown as Response,
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith("Unable to determine user ID");
  });

  it("GET /product/unmark-useful should return 500 if the database operation fails", async () => {
    deleteFromMock.mockReturnValue({
      execute: vi.fn().mockRejectedValue(new Error("delete failed")),
      where: vi.fn().mockReturnThis(),
    });
    const status = vi.fn().mockReturnThis();
    const send = vi.fn();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await postUnmarkUseful(
      {
        body: { aggregationName: "Pump", evidenceId: 1, supplierId: 3 },
        user: { id: 3 },
      } as unknown as Request,
      { send, status } as unknown as Response,
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith("Failed to unmark as useful");
    consoleError.mockRestore();
  });

  it("GET /product/:productId/add-evidence should return 200", async () => {
    const product = { productId: 42, productName: "Pump" };
    const userOrg = { organisationId: 1, organisationName: "Test Trust" };
    const productQuery = {
      executeTakeFirst: vi.fn().mockResolvedValue(product),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const organisationQuery = {
      executeTakeFirst: vi.fn().mockResolvedValue(userOrg),
      innerJoin: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };

    selectFromMock
      .mockReturnValueOnce(productQuery)
      .mockReturnValueOnce(organisationQuery);

    const render = vi.fn();
    await renderAddEvidence(
      {
        params: { productId: "42" },
        user: { id: 99 },
      } as unknown as Request,
      { render } as unknown as Response,
    );

    expect(selectFromMock).toHaveBeenNthCalledWith(1, "search");
    expect(render).toHaveBeenCalledWith("product/add-evidence", {
      organisationName: "Test Trust",
      productId: 42,
      productName: "Pump",
    });
  });

  it("GET /product/:productId/add-evidence should return 500 if the database operation fails", async () => {
    selectFromMock.mockReturnValue({
      executeTakeFirst: vi.fn().mockRejectedValue(new Error("db failed")),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    });

    const status = vi.fn().mockReturnThis();
    const send = vi.fn();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await renderAddEvidence(
      {
        params: { productId: "42" },
        user: { id: 99 },
      } as unknown as Request,
      { send, status } as unknown as Response,
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith("Failed to render add evidence form");
    consoleError.mockRestore();
  });

  it("POST /product/:productId/add-evidence should return 200", async () => {
    const product = { productId: 42, productName: "Pump" };
    const userOrg = { organisationId: 1, organisationName: "Test Trust" };
    const productQuery = {
      executeTakeFirst: vi.fn().mockResolvedValue(product),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const organisationQuery = {
      executeTakeFirst: vi.fn().mockResolvedValue(userOrg),
      innerJoin: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };

    const transaction = {
      commit: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue(undefined),
      }),
      insertInto: vi
        .fn()
        .mockReturnValueOnce({
          executeTakeFirstOrThrow: vi
            .fn()
            .mockResolvedValue({ evidenceId: 42 }),
          returning: vi.fn().mockReturnThis(),
          values: vi.fn().mockReturnThis(),
        })
        .mockReturnValueOnce({
          executeTakeFirstOrThrow: vi.fn().mockResolvedValue(undefined),
          values: vi.fn().mockReturnThis(),
        }),
      rollback: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue(undefined),
      }),
      withSchema: vi.fn().mockReturnThis(),
    };

    selectFromMock
      .mockReturnValueOnce(productQuery)
      .mockReturnValueOnce(organisationQuery);
    startTransactionMock.mockReturnValue({
      execute: vi.fn().mockResolvedValue(transaction),
    });

    const render = vi.fn();
    await postAddEvidence(
      {
        params: { productId: "42" },
        user: { id: 99 },
      } as unknown as Request,
      { render } as unknown as Response,
    );

    expect(startTransactionMock).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith("product/add-evidence-success", {
      evidenceId: 42,
      organisationName: "Test Trust",
      productId: 42,
      productName: "Pump",
    });
  });

  it("POST /product/:productId/add-evidence should return 500 if the database operation fails", async () => {
    const product = { productId: 42, productName: "Pump" };
    const userOrg = { organisationId: 1, organisationName: "Test Trust" };
    const productQuery = {
      executeTakeFirst: vi.fn().mockResolvedValue(product),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const organisationQuery = {
      executeTakeFirst: vi.fn().mockResolvedValue(userOrg),
      innerJoin: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };

    selectFromMock
      .mockReturnValueOnce(productQuery)
      .mockReturnValueOnce(organisationQuery);
    startTransactionMock.mockReturnValue({
      execute: vi.fn().mockRejectedValue(new Error("insert failed")),
    });

    const status = vi.fn().mockReturnThis();
    const send = vi.fn();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await postAddEvidence(
      {
        params: { productId: "42" },
        user: { id: 99 },
      } as unknown as Request,
      { send, status } as unknown as Response,
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith("Failed to add evidence");
    consoleError.mockRestore();
  });

  it("GET /product/:productId/evidence/add-evidence-contact-self should return 200", async () => {
    const product = { productId: 42, productName: "Pump" };
    const userOrg = { organisationId: 1, organisationName: "Test Trust" };
    const contact = {
      contactId: 7,
      email: "alex@example.com",
      givenName: "Alex",
      phoneNo: "123456",
      role: "Clinical Lead",
      surname: "One",
      title: "Dr",
      userId: 99,
    };
    const productQuery = {
      executeTakeFirst: vi.fn().mockResolvedValue(product),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const organisationQuery = {
      executeTakeFirst: vi.fn().mockResolvedValue(userOrg),
      innerJoin: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const contactQuery = {
      executeTakeFirst: vi.fn().mockResolvedValue(contact),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };

    selectFromMock
      .mockReturnValueOnce(productQuery)
      .mockReturnValueOnce(organisationQuery)
      .mockReturnValueOnce(contactQuery);

    const render = vi.fn();
    await renderAddEvidenceContactSelf(
      {
        params: { productId: "42" },
        user: { id: 99 },
      } as unknown as Request,
      { render } as unknown as Response,
    );

    expect(render).toHaveBeenCalledWith("product/add-evidence-contact-self", {
      contact,
      organisationName: "Test Trust",
      productId: 42,
      productName: "Pump",
    });
  });

  it("GET /product/:productId/evidence/add-evidence-contact-self should return 500 if the database operation fails", async () => {
    selectFromMock.mockReturnValue({
      executeTakeFirst: vi.fn().mockRejectedValue(new Error("db failed")),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    });

    const status = vi.fn().mockReturnThis();
    const send = vi.fn();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await renderAddEvidenceContactSelf(
      {
        params: { productId: "42" },
        user: { id: 99 },
      } as unknown as Request,
      { send, status } as unknown as Response,
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith(
      "Failed to render add evidence contact form",
    );
    consoleError.mockRestore();
  });

  it("POST /product/:productId/evidence/add-evidence-contact-self should return 200", async () => {
    const product = { productId: 42, productName: "Pump" };
    const userOrg = { organisationId: 1, organisationName: "Test Trust" };
    const contact = {
      contactId: 7,
      email: "alex@example.com",
      givenName: "Alex",
      phoneNo: "123456",
      role: "Clinical Lead",
      surname: "One",
      title: "Dr",
      userId: 99,
    };
    const productQuery = {
      executeTakeFirst: vi.fn().mockResolvedValue(product),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const organisationQuery = {
      executeTakeFirst: vi.fn().mockResolvedValue(userOrg),
      innerJoin: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const contactQuery = {
      executeTakeFirst: vi.fn().mockResolvedValue(contact),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const transaction = {
      commit: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue(undefined),
      }),
      insertInto: vi
        .fn()
        .mockReturnValueOnce({
          executeTakeFirstOrThrow: vi
            .fn()
            .mockResolvedValue({ evidenceId: 42 }),
          returning: vi.fn().mockReturnThis(),
          values: vi.fn().mockReturnThis(),
        })
        .mockReturnValueOnce({
          executeTakeFirstOrThrow: vi.fn().mockResolvedValue(undefined),
          values: vi.fn().mockReturnThis(),
        }),
      rollback: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue(undefined),
      }),
      withSchema: vi.fn().mockReturnThis(),
    };

    selectFromMock
      .mockReturnValueOnce(productQuery)
      .mockReturnValueOnce(organisationQuery)
      .mockReturnValueOnce(contactQuery);
    insertIntoMock.mockReturnValue({
      executeTakeFirstOrThrow: vi.fn().mockResolvedValue(undefined),
      values: vi.fn().mockReturnThis(),
    });
    startTransactionMock.mockReturnValue({
      execute: vi.fn().mockResolvedValue(transaction),
    });

    const render = vi.fn();
    await postAddEvidenceContactSelf(
      {
        body: { contactId: 7 },
        params: { productId: "42" },
        user: { id: 99 },
      } as unknown as Request,
      { render } as unknown as Response,
    );

    expect(insertIntoMock).toHaveBeenCalledWith("evidence_contacts");
    expect(render).toHaveBeenCalledWith(
      "product/add-evidence-contact-success",
      {
        contactName: "Dr Alex One",
        organisationName: "Test Trust",
        productId: 42,
        productName: "Pump",
      },
    );
  });

  it("POST /product/:productId/evidence/add-evidence-contact-self should return 500 if the database operation fails", async () => {
    const product = { productId: 42, productName: "Pump" };
    const userOrg = { organisationId: 1, organisationName: "Test Trust" };
    const productQuery = {
      executeTakeFirst: vi.fn().mockResolvedValue(product),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const organisationQuery = {
      executeTakeFirst: vi.fn().mockResolvedValue(userOrg),
      innerJoin: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const contactQuery = {
      executeTakeFirst: vi.fn().mockResolvedValue({
        contactId: 7,
        givenName: "Alex",
        surname: "One",
        title: "Dr",
      }),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };

    selectFromMock
      .mockReturnValueOnce(productQuery)
      .mockReturnValueOnce(organisationQuery)
      .mockReturnValueOnce(contactQuery);
    startTransactionMock.mockReturnValue({
      execute: vi.fn().mockRejectedValue(new Error("insert failed")),
    });

    const status = vi.fn().mockReturnThis();
    const send = vi.fn();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await postAddEvidenceContactSelf(
      {
        body: { contactId: 7 },
        params: { productId: "42" },
        user: { id: 99 },
      } as unknown as Request,
      { send, status } as unknown as Response,
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith("Failed to add evidence contact");
    consoleError.mockRestore();
  });

  it("GET /product/:productId/add-evidence should return 400 if the product ID is invalid", async () => {
    const status = vi.fn().mockReturnThis();
    const send = vi.fn();

    await renderAddEvidence(
      { params: { productId: "abc" }, user: { id: 99 } } as unknown as Request,
      { send, status } as unknown as Response,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith("Valid product ID is required");
  });

  it("POST /product/:productId/add-evidence should return 400 if the product ID is invalid", async () => {
    const status = vi.fn().mockReturnThis();
    const send = vi.fn();

    await postAddEvidence(
      { params: { productId: "abc" }, user: { id: 99 } } as unknown as Request,
      { send, status } as unknown as Response,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith("Valid product ID is required");
  });

  it("POST /product/:productId/evidence/add-evidence-contact-self should return 400 if the request body is invalid", async () => {
    const status = vi.fn().mockReturnThis();
    const send = vi.fn();

    await postAddEvidenceContactSelf(
      {
        body: {},
        params: { productId: "42" },
        user: { id: 99 },
      } as unknown as Request,
      { send, status } as unknown as Response,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith("Invalid request body");
  });
});
