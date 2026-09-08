import { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderProduct } from "./product.controller.js";

const { selectFromMock } = vi.hoisted(() => ({
  selectFromMock: vi.fn(),
}));

vi.mock("../database/client.js", () => ({
  db: {
    selectFrom: selectFromMock,
  },
}));

describe("Product controller", () => {
  beforeEach(() => {
    selectFromMock.mockReset();
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

    selectFromMock
      .mockReturnValueOnce(productQuery)
      .mockReturnValueOnce(documentsQuery)
      .mockReturnValueOnce(contactsQuery);

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
});
