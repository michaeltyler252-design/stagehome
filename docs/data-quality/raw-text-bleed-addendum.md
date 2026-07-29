# Addendum: Trailing Record-Bleed in Extracted Raw Text

Found while extracting Embu County's data. Documenting the full process
here, including the parts that didn't work on the first try, rather than
only the final clean state.

## What was found and fixed — full resolution, in three passes

Several already-extracted Nairobi and Kiambu raw text files ended with a
fragment belonging to the **next** property in the source document's
sequence, not the property the file is named for — the same "University
Information paragraph attached to the wrong place" artifact documented
since Milestone 1's institution register, just not fully trimmed out of
the raw text files themselves at the time.

This took three passes to resolve properly, and I'm documenting all three
rather than just the final state, because the earlier passes' partial
fixes are exactly the kind of "looked done, wasn't" mistake worth being
honest about:

1. **First pass:** trimmed at the last bare `### Heading` line. This worked
   for files where the bleed was marked by a clean heading, but left a
   second bleed layer underneath in several files (a University Information
   paragraph with no heading marker at all, sitting *before* the `###` line
   that got removed) — so some files looked fixed but weren't.
2. **Second pass:** found that 3 files (2 Kiambu, and Embu's own original
   extraction) had a reliable `---` horizontal-rule separator marking the
   true boundary, and re-trimmed at that separator instead. This fully
   resolved those files, but 8 remaining Nairobi files had no `---`
   separator at all — a different bleed shape.
3. **Third pass:** identified that all 8 remaining files shared one exact,
   consistent anchor — the phrase `"Street View: Not Available"` (the last
   field of every property's Images section), sometimes line-wrapped
   (`"Street View:\nNot Available"`). Verified this anchor occurs **exactly
   once** in each of the 8 files before cutting, trimmed everything after
   it, and confirmed each file now ends at a genuine record boundary.

**Final verification:** a scan across all 17 property files in all 5
audited counties for any line matching university-info-shaped patterns
(`GPS Coordinates`, `University Name`, `County:`, `Campus:` as the last
line) came back with zero remaining matches. An automated regression test
(`does not end with a stray markdown heading line`) also runs on every
county's manifest going forward.

**One file was checked and correctly left alone:** `station-view-residency-record-2.txt`
ends mid-Security-section, immediately followed in the *original source*
by the next university's heading with no separator and no further content
for this record at all — verified directly against the source document.
This is genuine incompleteness in the source itself (matching the master
document's own quality-control note: "Station View Residency: amenities
and later sections are incomplete in the source"), not an extraction
error, so it was left exactly as-is.

## Why this is noise, not corruption

In every case checked, the current property's own genuine fields (rent,
utilities, security, amenities, contact, availability, reviews, images) are
fully intact and appear *before* the bleed fragment. The trailing text is
extra, not a replacement or alteration of the real record. `rawText` in the
staging schema is explicitly meant to hold source content "close to
as-supplied" — a few trailing lines of adjacent noise is consistent with
that, not a violation of it.

## The underlying cause, for context

Every county's verification register already recommends re-extracting GPS
and campus fields "from the original per-property source files, not this
consolidated document." This bleed is the same root cause manifesting at
the full-record level: a clean re-extraction from `Pasted text (12).txt` /
`Pasted markdown (N).md` etc. directly (rather than this concatenated
master document) would never have had this problem, since it's an artifact
of how the many source files were merged into one PDF, not an artifact of
the underlying source data itself. Fixing the symptom (trimming the bleed
from the raw text) doesn't remove the reason to eventually do that cleaner
re-extraction — it just means today's staging data isn't carrying visible
noise in the meantime.

## Going forward

Embu's extraction (this same session) found and used a clean `---`
separator to correctly bound its record from the start, with no trailing
bleed at all. Every county audited from here on gets the same boundary
check — confirm the cut point against a recognizable end-of-record anchor
(an Images/Street View section, or a `---` separator) before committing a
raw text file, not a blind line-range copy — and the regression test added
this session will catch it if one slips through anyway.
