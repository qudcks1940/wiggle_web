import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { emptyStorybookDocument, storybookAspectRatio, validateStorybookDocument } from "../lib/storybook-model.ts";
import { printPdfs, printPageCount, renderBookPages } from "../lib/book-render.ts";
import { validatePrintPdf } from "../lib/print-validation.ts";
import { assertBookPrintSize } from "../lib/book-print-format.ts";
const spec = { bookSpecUid: "SQUAREBOOK_HC", name: "스퀘어북", bindingType: "PUR", pageMin: 24, pageMax: 130, pageIncrement: 2, innerTrimWidthMm: 243, innerTrimHeightMm: 248, hingeGapMm: 10 };
const size = { innerWidthMm: 249, innerHeightMm: 254, coverWidthMm: 544, coverHeightMm: 288, spineWidthMm: 10 };
test("new book has exact trim ratio; existing formats remain readable", () => {
  const doc = emptyStorybookDocument();
  assert.equal(doc.format, "squarebook-hc");
  assert.equal(storybookAspectRatio(doc.format), 243 / 248);
  for (const format of ["landscape", "portrait", "square", "squarebook-hc"]) assert.equal(validateStorybookDocument(emptyStorybookDocument(format)).format, format);
});
test("print page and spine boundaries follow the hardcover product", () => {
  for (const [n, expected] of [[1,24],[24,24],[25,26],[63,64],[65,66],[129,130]]) assert.equal(printPageCount(n,spec),expected);
  assert.throws(() => printPageCount(131,spec));
  assertBookPrintSize(size,64);
  assertBookPrintSize({...size,coverWidthMm:550,spineWidthMm:16},66);
  assert.throws(() => assertBookPrintSize(size,66));
  assert.throws(() => assertBookPrintSize({...size,innerWidthMm:243},24));
});
test("rendered pages and both generated PDFs retain the required physical geometry", async () => {
  const doc = emptyStorybookDocument(); doc.pages[0].background="#338866";
  const images=await renderBookPages(doc,new Map(),243);
  const meta=await sharp(images[0]).metadata(); assert.equal(meta.width,243); assert.equal(meta.height,248);
  const result=await printPdfs(images,spec,size,"규격 확인");
  const layout={spec,size,pageCount:24};
  assert.equal((await validatePrintPdf(result.inner,"inner",layout)).length,24);
  assert.equal((await validatePrintPdf(result.cover,"cover",layout)).length,1);
  const pdf=await PDFDocument.load(result.inner), trim=pdf.getPage(0).getTrimBox();
  assert.ok(Math.abs(trim.x*25.4/72-3)<.0001);
  assert.ok(Math.abs(trim.width*25.4/72-243)<.0001);
  assert.ok(Math.abs(trim.height*25.4/72-248)<.0001);
  await assert.rejects(printPdfs(images,{...spec,bookSpecUid:"PHOTOBOOK_A4_SC"},size,"wrong"));
});
