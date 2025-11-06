import sys
from PyPDF2 import PdfReader
import re

def clean_text(raw_text: str) -> str:
    """
    Clean and normalize text extracted from PDF pages.
    - Removes excessive newlines.
    - Merges wrapped lines.
    - Normalizes spacing.
    """
    # Replace multiple newlines with one temporary marker
    text = re.sub(r'\n{2,}', '<PARA_BREAK>', raw_text)
    # Replace single newlines (line wraps) with a space
    text = re.sub(r'(?<!<PARA_BREAK>)\n(?!<PARA_BREAK>)', ' ', text)
    # Restore paragraph breaks
    text = text.replace('<PARA_BREAK>', '\n\n')
    # Remove double spaces
    text = re.sub(r' {2,}', ' ', text)
    return text.strip()

def parse_pdf_to_txt(input_pdf, output_txt):
    reader = PdfReader(input_pdf)
    pages_text = []

    for page_num, page in enumerate(reader.pages):
        text = page.extract_text()
        if text:
            cleaned = clean_text(text)
            pages_text.append(cleaned)
        else:
            print(f"⚠️ Warning: Page {page_num + 1} contains no extractable text.")

    full_text = "\n\n--- PAGE BREAK ---\n\n".join(pages_text)

    with open(output_txt, "w", encoding="utf-8") as f:
        f.write(full_text)

    print(f"✅ Cleaned text from {len(reader.pages)} pages saved to '{output_txt}'.")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python parse_pdf_to_txt.py <input.pdf> <output.txt>")
    else:
        input_pdf = sys.argv[1]
        output_txt = sys.argv[2]
        parse_pdf_to_txt(input_pdf, output_txt)
