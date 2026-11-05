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
  getAggregationNameForProductIdMock,
  getAggregationWithNameMock,
  getContractCountForAggregationMock,
  getCountOfContactsWithExperienceWithAggregationMock,
  getCountOfDocumentsByTypeForAggregationMock,
  getCountOfOrganisationsWithExperienceWithAggregationMock,
  getGmdnTermForDeviceIdMock,
  getSupplierWithIdMock,
} = vi.hoisted(() => ({
  getAggregationNameForProductIdMock: vi.fn(),
  getAggregationWithNameMock: vi.fn(),
  getContractCountForAggregationMock: vi.fn(),
  getCountOfContactsWithExperienceWithAggregationMock: vi.fn(),
  getCountOfDocumentsByTypeForAggregationMock: vi.fn(),
  getCountOfOrganisationsWithExperienceWithAggregationMock: vi.fn(),
  getGmdnTermForDeviceIdMock: vi.fn(),
  getSupplierWithIdMock: vi.fn(),
}));

vi.mock("../services/productsService.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/productsService.js")>()),
  getAggregationNameForProductId: getAggregationNameForProductIdMock,
  getAggregationWithName: getAggregationWithNameMock,
  getCountOfContactsWithExperienceWithAggregation:
    getCountOfContactsWithExperienceWithAggregationMock,
  getCountOfDocumentsByTypeForAggregation:
    getCountOfDocumentsByTypeForAggregationMock,
  getCountOfOrganisationsWithExperienceWithAggregation:
    getCountOfOrganisationsWithExperienceWithAggregationMock,
}));

vi.mock("../services/atamisService.js", () => ({
  getContractCountForAggregation: getContractCountForAggregationMock,
}));

vi.mock("../services/gmdnCategoryService.js", () => ({
  getGmdnTermForDeviceId: getGmdnTermForDeviceIdMock,
}));

vi.mock("../services/supplierService.js", () => ({
  getSupplierWithId: getSupplierWithIdMock,
}));

describe("Product controller", () => {
  beforeEach(() => {
    countMock.mockReset();
    deleteFromMock.mockReset();
    insertIntoMock.mockReset();
    maxMock.mockReset();
    selectFromMock.mockReset();
    startTransactionMock.mockReset();
    getAggregationWithNameMock.mockReset();
    getContractCountForAggregationMock.mockReset();
    getCountOfContactsWithExperienceWithAggregationMock.mockReset();
    getCountOfDocumentsByTypeForAggregationMock.mockReset();
    getCountOfOrganisationsWithExperienceWithAggregationMock.mockReset();
    getGmdnTermForDeviceIdMock.mockReset();
    getSupplierWithIdMock.mockReset();

    getAggregationNameForProductIdMock.mockReset();
    getAggregationNameForProductIdMock.mockResolvedValue("Pump");

    countMock.mockReturnValue({
      as: vi.fn().mockReturnValue("totalUsefulCount"),
    });
    maxMock.mockReturnValue({
      as: vi.fn().mockReturnValue("hasUserMarkedUseful"),
    });
  });

  it("GET /product/:aggregationName returns 404 when aggregation name is missing", async () => {
    const req = { params: {} } as unknown as Request;
    const render = vi.fn();
    const status = vi.fn().mockReturnValue({ render });
    const res = { status } as unknown as Response;

    await renderProduct(req, res);

    expect(status).toHaveBeenCalledWith(404);
    expect(render).toHaveBeenCalledWith("not-found");
    expect(getAggregationWithNameMock).not.toHaveBeenCalled();
  });

  it("GET /product/:aggregationName returns 404 when no aggregation is found", async () => {
    getAggregationWithNameMock.mockResolvedValue([]);

    const req = {
      params: { aggregationName: "Unknown" },
    } as unknown as Request;
    const render = vi.fn();
    const status = vi.fn().mockReturnValue({ render });
    const res = { status } as unknown as Response;

    await renderProduct(req, res);

    expect(getAggregationWithNameMock).toHaveBeenCalledWith("Unknown");
    expect(status).toHaveBeenCalledWith(404);
    expect(render).toHaveBeenCalledWith("not-found");
    expect(getSupplierWithIdMock).not.toHaveBeenCalled();
  });

  it("GET /product/:aggregationName renders the product page with aggregation details", async () => {
    const relevantDocuments = [{ count: 2, documentType: "Business case" }];
    getAggregationWithNameMock.mockResolvedValue([
      { aggregationName: "Pump", deviceId: 5, manufacturerId: 3 },
    ]);
    getSupplierWithIdMock.mockResolvedValue({
      manOrganisationName: "Acme Medical",
    });
    getGmdnTermForDeviceIdMock.mockResolvedValue("Infusion pump");
    getCountOfOrganisationsWithExperienceWithAggregationMock.mockResolvedValue(
      4,
    );
    getCountOfContactsWithExperienceWithAggregationMock.mockResolvedValue(7);
    getContractCountForAggregationMock.mockResolvedValue(2);
    getCountOfDocumentsByTypeForAggregationMock.mockResolvedValue(
      relevantDocuments,
    );

    const render = vi.fn();
    await renderProduct(
      { params: { aggregationName: "Pump" } } as unknown as Request,
      { render } as unknown as Response,
    );

    expect(getSupplierWithIdMock).toHaveBeenCalledWith(3);
    expect(getGmdnTermForDeviceIdMock).toHaveBeenCalledWith(5);
    expect(render).toHaveBeenCalledWith("product", {
      productAggregation: {
        aggregationName: "Pump",
        deviceType: "Infusion pump",
        peopleWithExperienceCount: 7,
        procurementContractCount: 2,
        relevantDocuments,
        supplierName: "Acme Medical",
        trustsWithExperienceCount: 4,
      },
    });
  });

  it("GET /product/:aggregationName renders an empty supplier name when the supplier is not found", async () => {
    getAggregationWithNameMock.mockResolvedValue([
      { aggregationName: "Pump", deviceId: 5, manufacturerId: 3 },
    ]);
    getSupplierWithIdMock.mockResolvedValue(null);
    getGmdnTermForDeviceIdMock.mockResolvedValue("Infusion pump");
    getCountOfOrganisationsWithExperienceWithAggregationMock.mockResolvedValue(
      0,
    );
    getCountOfContactsWithExperienceWithAggregationMock.mockResolvedValue(0);
    getContractCountForAggregationMock.mockResolvedValue(0);
    getCountOfDocumentsByTypeForAggregationMock.mockResolvedValue([]);

    const render = vi.fn();
    await renderProduct(
      { params: { aggregationName: "Pump" } } as unknown as Request,
      { render } as unknown as Response,
    );

    const payload = render.mock.calls[0]?.[1] as {
      productAggregation: { supplierName: string };
    };
    expect(payload.productAggregation.supplierName).toBe("");
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
        body: { aggregationName: "Pump", evidenceId: "12" },
        user: { id: 56 },
      } as unknown as Request,
      { send, status } as unknown as Response,
    );

    expect(insertIntoMock).toHaveBeenCalledWith("product_evidence_useful");
    expect(insertQuery.values).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregationName: "Pump",
        evidenceId: 12,
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
        body: { aggregationName: "Pump", evidenceId: 12 },
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
    expect(deleteQuery.where).toHaveBeenNthCalledWith(3, "userId", "=", 56);
    expect(status).toHaveBeenCalledWith(200);
    expect(send).toHaveBeenCalledWith({ count: 2 });
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
      "Aggregation name and Evidence ID are required",
    );
  });

  it("GET /product/mark-useful should return 500 if user cannot be retrieved", async () => {
    const status = vi.fn().mockReturnThis();
    const send = vi.fn();
    await postMarkUseful(
      {
        body: { aggregationName: "Pump", evidenceId: 1 },
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
        body: { aggregationName: "Pump", evidenceId: 1 },
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
      "Aggregation name and Evidence ID are required",
    );
  });

  it("GET /product/unmark-useful should return 500 if user cannot be retrieved", async () => {
    const status = vi.fn().mockReturnThis();
    const send = vi.fn();
    await postUnmarkUseful(
      {
        body: { aggregationName: "Pump", evidenceId: 1 },
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
        body: { aggregationName: "Pump", evidenceId: 1 },
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
