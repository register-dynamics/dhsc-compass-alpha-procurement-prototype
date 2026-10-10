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

describe("Product controller", () => {
  beforeEach(() => {
    countMock.mockReset();
    deleteFromMock.mockReset();
    insertIntoMock.mockReset();
    maxMock.mockReset();
    selectFromMock.mockReset();
    startTransactionMock.mockReset();

    countMock.mockReturnValue({
      as: vi.fn().mockReturnValue("totalUsefulCount"),
    });
    maxMock.mockReturnValue({
      as: vi.fn().mockReturnValue("hasUserMarkedUseful"),
    });
  });

  it("GET /product/:id returns 400 when product ID cannot be parsed", async () => {
    const req = {
      params: { id: Symbol("bad-id") as unknown as string },
    } as unknown as Request;
    const send = vi.fn();
    const status = vi.fn().mockReturnValue({ send });
    const res = { status } as unknown as Response;

    await renderProduct(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith("Invalid Product ID");
    expect(selectFromMock).not.toHaveBeenCalled();
  });

  it("GET /product/:id returns 400 when product ID is missing or invalid", async () => {
    const req = { params: { id: "abc" } } as unknown as Request;
    const send = vi.fn();
    const status = vi.fn().mockReturnValue({ send });
    const res = { status } as unknown as Response;

    await renderProduct(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith("Product ID is required");
    expect(selectFromMock).not.toHaveBeenCalled();
  });

  it("GET /product/:id returns 404 when no product is found", async () => {
    const productQuery = {
      executeTakeFirst: vi.fn().mockResolvedValue(undefined),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };

    selectFromMock.mockReturnValue(productQuery);

    const req = { params: { id: "123" } } as unknown as Request;
    const send = vi.fn();
    const status = vi.fn().mockReturnValue({ send });
    const res = { status } as unknown as Response;

    await renderProduct(req, res);

    expect(selectFromMock).toHaveBeenCalledWith("search");
    expect(productQuery.where).toHaveBeenCalledWith("productId", "=", 123);
    expect(status).toHaveBeenCalledWith(404);
    expect(send).toHaveBeenCalledWith("Product not found");
  });

  it("GET /product/:id renders product page with no documents", async () => {
    const product = { productId: 7, technologyName: "Example device" };
    const userOrg = { organisationId: 1, organisationName: "Test Trust" };
    const productQuery = {
      executeTakeFirst: vi.fn().mockResolvedValue(product),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const evidenceQuery = {
      execute: vi.fn().mockResolvedValue([]),
      innerJoin: vi.fn().mockReturnThis(),
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
      .mockReturnValueOnce(evidenceQuery)
      .mockReturnValueOnce(organisationQuery);

    const req = { params: { id: "7" }, user: { id: 99 } } as unknown as Request;
    const render = vi.fn();
    const res = { render } as unknown as Response;

    await renderProduct(req, res);

    expect(selectFromMock).toHaveBeenNthCalledWith(1, "search");
    expect(selectFromMock).toHaveBeenNthCalledWith(2, "evidence");
    expect(render).toHaveBeenCalledWith("product", {
      evidences: [],
      hasEvidenceFromUsersOrg: false,
      organisationName: "Test Trust",
      product,
    });
  });

  it("GET /product/:id renders product page and attaches contacts to each evidence", async () => {
    const product = { productId: 42, technologyName: "Pump" };
    const userOrg = { organisationId: 1, organisationName: "Test Trust" };
    const evidences = [
      { evidenceId: 1001, title: "Implementation guide" },
      { evidenceId: 1002, title: "Outcomes report" },
    ];
    const contacts = [
      {
        contactId: 1,
        discussBusinessCase: 1,
        discussEhrIntegration: 0,
        discussImplementation: 1,
        discussOutcomes: 0,
        discussPharmacyIntegration: 0,
        discussRealWorldUse: 0,
        discussTraining: 0,
        email: "one@example.com",
        evidenceId: 1001,
        givenName: "Alex",
        phoneNo: "123456",
        role: "Clinical Lead",
        surname: "One",
        title: "Dr",
      },
      {
        contactId: 2,
        discussBusinessCase: 0,
        discussEhrIntegration: 1,
        discussImplementation: 0,
        discussOutcomes: 1,
        discussPharmacyIntegration: 0,
        discussRealWorldUse: 1,
        discussTraining: 1,
        email: "two@example.com",
        evidenceId: 1002,
        givenName: "Sam",
        phoneNo: "654321",
        role: "Operations Lead",
        surname: "Two",
        title: "Mx",
      },
    ];

    const productQuery = {
      executeTakeFirst: vi.fn().mockResolvedValue(product),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const evidenceQuery = {
      execute: vi.fn().mockResolvedValue(evidences),
      innerJoin: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const documentsQuery = {
      execute: vi.fn().mockResolvedValue(contacts),
      innerJoin: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const usefulQuery = {
      execute: vi.fn().mockResolvedValue([]),
      groupBy: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const contactsQuery = {
      execute: vi.fn().mockResolvedValue(contacts),
      innerJoin: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
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
      .mockReturnValueOnce(evidenceQuery)
      .mockReturnValueOnce(documentsQuery)
      .mockReturnValueOnce(usefulQuery)
      .mockReturnValueOnce(contactsQuery)
      .mockReturnValueOnce(organisationQuery);

    const req = {
      params: { id: "42" },
      user: { id: 99 },
    } as unknown as Request;
    const render = vi.fn();
    const res = { render } as unknown as Response;

    await renderProduct(req, res);

    expect(selectFromMock).toHaveBeenNthCalledWith(1, "search");
    expect(selectFromMock).toHaveBeenNthCalledWith(2, "evidence");
    expect(selectFromMock).toHaveBeenNthCalledWith(3, "documents");
    expect(selectFromMock).toHaveBeenNthCalledWith(
      4,
      "product_evidence_useful",
    );
    expect(selectFromMock).toHaveBeenNthCalledWith(
      5,
      "evidence_contacts as ec",
    );
    expect(contactsQuery.innerJoin).toHaveBeenCalledWith(
      "contacts as c",
      "c.contactId",
      "ec.contactId",
    );
    expect(contactsQuery.where).toHaveBeenCalledWith(
      "ec.evidenceId",
      "in",
      [1001, 1002],
    );

    expect(render).toHaveBeenCalledTimes(1);
    const renderPayload = render.mock.calls[0]?.[1] as {
      evidences: { contacts?: unknown[]; evidenceId: number }[];
      organisationName: string;
      product: unknown;
    };
    expect(renderPayload.product).toEqual(product);
    expect(renderPayload.evidences).toHaveLength(2);
    expect(renderPayload.evidences[0]?.contacts).toEqual([contacts[0]]);
    expect(renderPayload.evidences[1]?.contacts).toEqual([contacts[1]]);
    expect(
      (renderPayload as { organisationName: string }).organisationName,
    ).toBe("Test Trust");
  });

  it("GET /product/:id should render the product page with a generic evidence card", async () => {
    const product = { productId: 7, productName: "Example device" };
    const userOrg = { organisationId: 1, organisationName: "Test Trust" };
    const evidences = [
      {
        evidenceId: 70,
        productId: 7,
        typeOfEvidenceDesc: "Generic evidence",
      },
    ];
    const productQuery = {
      executeTakeFirst: vi.fn().mockResolvedValue(product),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const evidenceQuery = {
      execute: vi.fn().mockResolvedValue(evidences),
      innerJoin: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const documentsQuery = {
      execute: vi.fn().mockResolvedValue([]),
      innerJoin: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const usefulQuery = {
      execute: vi
        .fn()
        .mockResolvedValue([
          { evidenceId: 70, hasUserMarkedUseful: 1, totalUsefulCount: 3 },
        ]),
      groupBy: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const contactsQuery = {
      execute: vi.fn().mockResolvedValue([]),
      innerJoin: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
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
      .mockReturnValueOnce(evidenceQuery)
      .mockReturnValueOnce(documentsQuery)
      .mockReturnValueOnce(usefulQuery)
      .mockReturnValueOnce(contactsQuery)
      .mockReturnValueOnce(organisationQuery);

    const render = vi.fn();
    await renderProduct(
      {
        params: { id: "7" },
        user: { id: 99 },
      } as unknown as Request,
      { render } as unknown as Response,
    );

    expect(render).toHaveBeenCalledWith("product", {
      evidences: [
        expect.objectContaining({
          contacts: [],
          markedUseful: 1,
          totalUsefulCount: 3,
          typeOfEvidenceDesc: "Generic evidence",
        }),
      ],
      hasEvidenceFromUsersOrg: false,
      organisationName: "Test Trust",
      product,
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
        body: { evidenceId: "12", productId: "34" },
        user: { id: 56 },
      } as unknown as Request,
      { send, status } as unknown as Response,
    );

    expect(insertIntoMock).toHaveBeenCalledWith("product_evidence_useful");
    expect(insertQuery.values).toHaveBeenCalledWith(
      expect.objectContaining({ evidenceId: 12, productId: 34, userId: 56 }),
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
        body: { evidenceId: 12, productId: 34 },
        user: { id: 56 },
      } as unknown as Request,
      { send, status } as unknown as Response,
    );

    expect(deleteFromMock).toHaveBeenCalledWith("product_evidence_useful");
    expect(deleteQuery.where).toHaveBeenNthCalledWith(1, "evidenceId", "=", 12);
    expect(deleteQuery.where).toHaveBeenNthCalledWith(2, "productId", "=", 34);
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
      "Product ID and Evidence ID are required",
    );
  });

  it("GET /product/mark-useful should return 500 if user cannot be retrieved", async () => {
    const status = vi.fn().mockReturnThis();
    const send = vi.fn();
    await postMarkUseful(
      { body: { evidenceId: 1, productId: 2 } } as unknown as Request,
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
        body: { evidenceId: 1, productId: 2 },
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
      { body: { productId: 1 } } as unknown as Request,
      { send, status } as unknown as Response,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith(
      "Product ID and Evidence ID are required",
    );
  });

  it("GET /product/unmark-useful should return 500 if user cannot be retrieved", async () => {
    const status = vi.fn().mockReturnThis();
    const send = vi.fn();
    await postUnmarkUseful(
      { body: { evidenceId: 1, productId: 2 } } as unknown as Request,
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
        body: { evidenceId: 1, productId: 2 },
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

  it("GET /product/:id returns 500 when the user organisation cannot be determined", async () => {
    const product = { productId: 7, technologyName: "Example device" };
    const productQuery = {
      executeTakeFirst: vi.fn().mockResolvedValue(product),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const evidenceQuery = {
      execute: vi.fn().mockResolvedValue([]),
      innerJoin: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const organisationQuery = {
      executeTakeFirst: vi.fn().mockResolvedValue(null),
      innerJoin: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };

    selectFromMock
      .mockReturnValueOnce(productQuery)
      .mockReturnValueOnce(evidenceQuery)
      .mockReturnValueOnce(organisationQuery);

    const status = vi.fn().mockReturnThis();
    const send = vi.fn();

    await renderProduct(
      { params: { id: "7" }, user: { id: 99 } } as unknown as Request,
      { send, status } as unknown as Response,
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith("Unable to determine user organisation");
  });

  it("GET /product/:id marks user evidence as from the same organisation", async () => {
    const product = { productId: 7, technologyName: "Example device" };
    const userOrg = { organisationId: 1, organisationName: "Test Trust" };
    const evidence = {
      evidenceId: 50,
      organisationId: 1,
      title: "Implementation guide",
    };
    const productQuery = {
      executeTakeFirst: vi.fn().mockResolvedValue(product),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const evidenceQuery = {
      execute: vi.fn().mockResolvedValue([evidence]),
      innerJoin: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const documentsQuery = {
      execute: vi.fn().mockResolvedValue([]),
      innerJoin: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const usefulQuery = {
      execute: vi
        .fn()
        .mockResolvedValue([
          { evidenceId: 50, hasUserMarkedUseful: 1, totalUsefulCount: 4 },
        ]),
      groupBy: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const contactsQuery = {
      execute: vi.fn().mockResolvedValue([]),
      innerJoin: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
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
      .mockReturnValueOnce(evidenceQuery)
      .mockReturnValueOnce(documentsQuery)
      .mockReturnValueOnce(usefulQuery)
      .mockReturnValueOnce(contactsQuery)
      .mockReturnValueOnce(organisationQuery);

    const render = vi.fn();

    await renderProduct(
      { params: { id: "7" }, user: { id: 99 } } as unknown as Request,
      { render } as unknown as Response,
    );

    const payload = render.mock.calls[0]?.[1] as {
      evidences: {
        evidenceId: number;
        markedUseful: number;
        totalUsefulCount: number;
      }[];
      hasEvidenceFromUsersOrg: boolean;
    };

    expect(payload.hasEvidenceFromUsersOrg).toBe(true);
    expect(payload.evidences[0]?.markedUseful).toBe(1);
    expect(payload.evidences[0]?.totalUsefulCount).toBe(4);
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
