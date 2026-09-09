import { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  postMarkUseful,
  postUnmarkUseful,
  renderProduct,
} from "./product.controller.js";

const {
  countMock,
  deleteFromMock,
  insertIntoMock,
  maxMock,
  selectFromMock,
} = vi.hoisted(() => ({
  countMock: vi.fn(),
  deleteFromMock: vi.fn(),
  insertIntoMock: vi.fn(),
  maxMock: vi.fn(),
  selectFromMock: vi.fn(),
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
  },
}));

describe("Product controller", () => {
  beforeEach(() => {
    countMock.mockReset();
    deleteFromMock.mockReset();
    insertIntoMock.mockReset();
    maxMock.mockReset();
    selectFromMock.mockReset();

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
    const productQuery = {
      executeTakeFirst: vi.fn().mockResolvedValue(product),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const documentsQuery = {
      execute: vi.fn().mockResolvedValue([]),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };

    selectFromMock
      .mockReturnValueOnce(productQuery)
      .mockReturnValueOnce(documentsQuery);

    const req = { params: { id: "7" } } as unknown as Request;
    const render = vi.fn();
    const res = { render } as unknown as Response;

    await renderProduct(req, res);

    expect(selectFromMock).toHaveBeenNthCalledWith(1, "search");
    expect(selectFromMock).toHaveBeenNthCalledWith(2, "make_documents");
    expect(render).toHaveBeenCalledWith("product", {
      documents: [],
      product,
    });
  });

  it("GET /product/:id renders product page and attaches contacts to each document", async () => {
    const product = { productId: 42, technologyName: "Pump" };
    const documents = [
      { documentId: 1001, title: "Implementation guide" },
      { documentId: 1002, title: "Outcomes report" },
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
        documentId: 1001,
        email: "one@example.com",
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
        documentId: 1002,
        email: "two@example.com",
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
    const documentsQuery = {
      execute: vi.fn().mockResolvedValue(documents),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const contactsQuery = {
      execute: vi.fn().mockResolvedValue(contacts),
      innerJoin: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const usefulQuery = {
      execute: vi.fn().mockResolvedValue([]),
      groupBy: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };

    selectFromMock
      .mockReturnValueOnce(productQuery)
      .mockReturnValueOnce(documentsQuery)
      .mockReturnValueOnce(contactsQuery)
      .mockReturnValueOnce(usefulQuery);

    const req = { params: { id: "42" } } as unknown as Request;
    const render = vi.fn();
    const res = { render } as unknown as Response;

    await renderProduct(req, res);

    expect(selectFromMock).toHaveBeenNthCalledWith(1, "search");
    expect(selectFromMock).toHaveBeenNthCalledWith(2, "make_documents");
    expect(selectFromMock).toHaveBeenNthCalledWith(
      3,
      "document_contacts as dc",
    );
    expect(contactsQuery.innerJoin).toHaveBeenCalledWith(
      "contacts as c",
      "c.contactId",
      "dc.contactId",
    );
    expect(contactsQuery.where).toHaveBeenCalledWith(
      "dc.documentId",
      "in",
      [1001, 1002],
    );

    expect(render).toHaveBeenCalledTimes(1);
    const renderPayload = render.mock.calls[0]?.[1] as {
      documents: { contacts?: unknown[]; documentId: number }[];
      product: unknown;
    };
    expect(renderPayload.product).toEqual(product);
    expect(renderPayload.documents).toHaveLength(2);
    expect(renderPayload.documents[0]?.contacts).toEqual([contacts[0]]);
    expect(renderPayload.documents[1]?.contacts).toEqual([contacts[1]]);
  });

  it("GET /product/:id should render the product page with a generic evidence card", async () => {
    const product = { productId: 7, productName: "Example device" };
    const documents = [
      {
        documentId: 70,
        productId: 7,
        typeOfDocDesc: "Generic evidence",
      },
    ];
    const productQuery = {
      executeTakeFirst: vi.fn().mockResolvedValue(product),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const documentsQuery = {
      execute: vi.fn().mockResolvedValue(documents),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const contactsQuery = {
      execute: vi.fn().mockResolvedValue([]),
      innerJoin: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const usefulQuery = {
      execute: vi.fn().mockResolvedValue([
        { documentId: 70, hasUserMarkedUseful: 1, totalUsefulCount: 3 },
      ]),
      groupBy: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };

    selectFromMock
      .mockReturnValueOnce(productQuery)
      .mockReturnValueOnce(documentsQuery)
      .mockReturnValueOnce(contactsQuery)
      .mockReturnValueOnce(usefulQuery);

    const render = vi.fn();
    await renderProduct(
      {
        params: { id: "7" },
        user: { id: 99 },
      } as unknown as Request,
      { render } as unknown as Response,
    );

    expect(render).toHaveBeenCalledWith("product", {
      documents: [
        expect.objectContaining({
          contacts: [],
          markedUseful: 1,
          totalUsefulCount: 3,
          typeOfDocDesc: "Generic evidence",
        }),
      ],
      product,
    });
  });

  it("GET /product/mark-useful should mark a document as useful", async () => {
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
        body: { documentId: "12", productId: "34" },
        user: { id: 56 },
      } as unknown as Request,
      { send, status } as unknown as Response,
    );

    expect(insertIntoMock).toHaveBeenCalledWith("product_documents_useful");
    expect(insertQuery.values).toHaveBeenCalledWith(
      expect.objectContaining({ documentId: 12, productId: 34, userId: 56 }),
    );
    expect(status).toHaveBeenCalledWith(200);
    expect(send).toHaveBeenCalledWith({ count: 4 });
  });

  it("GET /product/unmark-useful should unmark a document as useful", async () => {
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
        body: { documentId: 12, productId: 34 },
        user: { id: 56 },
      } as unknown as Request,
      { send, status } as unknown as Response,
    );

    expect(deleteFromMock).toHaveBeenCalledWith("product_documents_useful");
    expect(deleteQuery.where).toHaveBeenNthCalledWith(1, "documentId", "=", 12);
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
    expect(send).toHaveBeenCalledWith("Product ID and Document ID are required");
  });

  it("GET /product/mark-useful should return 500 if user cannot be retrieved", async () => {
    const status = vi.fn().mockReturnThis();
    const send = vi.fn();
    await postMarkUseful(
      { body: { documentId: 1, productId: 2 } } as unknown as Request,
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
      { body: { documentId: 1, productId: 2 }, user: { id: 3 } } as unknown as Request,
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
    expect(send).toHaveBeenCalledWith("Product ID and Document ID are required");
  });

  it("GET /product/unmark-useful should return 500 if user cannot be retrieved", async () => {
    const status = vi.fn().mockReturnThis();
    const send = vi.fn();
    await postUnmarkUseful(
      { body: { documentId: 1, productId: 2 } } as unknown as Request,
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
      { body: { documentId: 1, productId: 2 }, user: { id: 3 } } as unknown as Request,
      { send, status } as unknown as Response,
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith("Failed to unmark as useful");
    consoleError.mockRestore();
  });

});
