/**
 * Wording pools for the "thinking" indicators. Every stage of quote generation
 * has many alternative phrasings; one is picked at random per stage each time a
 * quote starts, so no two runs read the same (12+ variants across 10 stages is
 * well over a million distinct sequences). The chat reply indicator draws from
 * its own pools the same way.
 */

const GEN_STAGES: string[][] = [
  // 1 — gathering the brand data
  [
    'Collecting the selected brands’ price lists…',
    'Gathering the price lists for your brands…',
    'Pulling up the brand catalogues…',
    'Loading the trained price lists…',
    'Opening the brand’s reference files…',
    'Fetching the catalogue rows for matching…',
    'Bringing in the brand rules and price lists…',
    'Getting the brand knowledge ready…',
    'Lining up the catalogues to search…',
    'Reading the brand’s keyword prompts…',
    'Assembling the catalogue pool…',
    'Preparing the price data for this quote…',
  ],
  // 2 — reading the BOQ
  [
    'Reading your BOQ documents…',
    'Opening the BOQ you attached…',
    'Going through the uploaded documents…',
    'Reading the bill of quantities…',
    'Scanning the BOQ pages…',
    'Taking in the specification sheets…',
    'Reading every sheet of the BOQ…',
    'Looking through the attached files…',
    'Parsing the BOQ text…',
    'Reading the enquiry documents…',
    'Loading the BOQ into view…',
    'Going line by line through the BOQ…',
  ],
  // 3 — understanding
  [
    'Understanding the requirements…',
    'Working out what the panel needs…',
    'Making sense of the requirement notes…',
    'Interpreting the specification…',
    'Reading the panel headings and notes…',
    'Understanding the boards and feeders…',
    'Picking up the global notes and conditions…',
    'Figuring out the scope of supply…',
    'Studying the requirement in detail…',
    'Decoding the trade shorthand…',
    'Understanding which items belong together…',
    'Reading between the lines of the spec…',
  ],
  // 4 — extraction
  [
    'Extracting every line item…',
    'Listing out each line item…',
    'Pulling out every item in the BOQ…',
    'Itemising the requirement…',
    'Separating the items one by one…',
    'Writing down each breaker and accessory…',
    'Capturing every product mentioned…',
    'Building the item list…',
    'Turning the BOQ into clean line items…',
    'Extracting quantities and panel counts…',
    'Counting the items per panel…',
    'Splitting bundled lines into products…',
  ],
  // 5 — specs
  [
    'Decoding specifications — ratings, poles, kA, voltage…',
    'Reading ratings, poles and breaking capacity…',
    'Working out amps, poles and kA per item…',
    'Noting the voltage and release type of each line…',
    'Checking the technical values on every line…',
    'Sorting out thermal-magnetic from microprocessor…',
    'Reading the electrical values…',
    'Picking up colours, voltages and classes…',
    'Recording the rating of every breaker…',
    'Decoding the spec tokens…',
    'Capturing every stated value with its unit…',
    'Pinning down the variant details…',
  ],
  // 6 — matching
  [
    'Matching parts against the catalogue…',
    'Searching the price list for each item…',
    'Finding the catalogue rows that fit…',
    'Looking up each item in the brand catalogue…',
    'Matching lines to catalog numbers…',
    'Comparing each requirement with the price list…',
    'Finding candidates for every line…',
    'Running the catalogue search…',
    'Pairing items with products…',
    'Locating the right rows in the price list…',
    'Matching breakers and accessories…',
    'Checking the catalogue for each requirement…',
  ],
  // 7 — variants
  [
    'Selecting the right variants…',
    'Choosing the correct frame and series…',
    'Picking the best-fit catalog number…',
    'Deciding between the candidate products…',
    'Applying the brand rules to the choices…',
    'Settling on the right release type…',
    'Choosing frames for the accessories…',
    'Resolving each line to one product…',
    'Weighing up the candidate rows…',
    'Selecting the matching series…',
    'Confirming the pole and kA variants…',
    'Locking in the catalog numbers…',
  ],
  // 8 — pricing
  [
    'Calculating prices and quantities…',
    'Working out the totals…',
    'Multiplying quantities by panel counts…',
    'Applying list prices and discounts…',
    'Pricing every line…',
    'Adding up the amounts…',
    'Computing rates from the price list…',
    'Totalling each feeder…',
    'Deriving accessory quantities from their breakers…',
    'Running the numbers…',
    'Costing the bill of materials…',
    'Filling in list price, rate and amount…',
  ],
  // 9 — assembling
  [
    'Assembling your quote…',
    'Grouping items by board and feeder…',
    'Putting the quote together…',
    'Laying out the bill of materials…',
    'Building the feeder structure…',
    'Merging duplicate lines…',
    'Arranging the lines in order…',
    'Composing the quotation…',
    'Organising the panel sections…',
    'Shaping the final line list…',
    'Building the Excel workbook…',
    'Consolidating the quote…',
  ],
  // 10 — finishing
  [
    'Finalizing the draft…',
    'Wrapping up…',
    'Almost there…',
    'Putting on the finishing touches…',
    'Preparing the file for download…',
    'Doing a last check of the lines…',
    'Getting the draft ready…',
    'Finishing the quotation…',
    'One moment — nearly done…',
    'Saving the quote…',
    'Flagging lines that need review…',
    'Completing the draft…',
  ],
];

/** Chat reply indicator: three stages, each with many phrasings. */
const CHAT_STAGES: string[][] = [
  [
    'Thinking…',
    'Reading your message…',
    'Looking at the quote…',
    'Checking the brand rules…',
    'Going through the reference files…',
    'Considering that…',
    'Having a look…',
    'Reading the catalogue…',
    'Taking a look at the lines…',
    'Understanding the request…',
  ],
  [
    'Working on it…',
    'Applying the change…',
    'Looking up the price list…',
    'Putting that together…',
    'Checking the numbers…',
    'Making the update…',
    'Finding the right products…',
    'Re-pricing the lines…',
    'Working through the feeders…',
    'Sorting that out…',
  ],
  [
    'Almost there…',
    'Nearly done…',
    'Just a moment…',
    'Finishing up…',
    'Wrapping this up…',
    'One second…',
    'Tidying up the reply…',
    'Updating the file…',
    'Final check…',
    'Ready in a moment…',
  ],
];

const pickOne = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)]!;

/** A fresh random phrasing for every stage of quote generation. */
export const pickGenPhases = (): string[] => GEN_STAGES.map(pickOne);

/**
 * The server's real pipeline stages, each with a freshly picked phrasing. The
 * progress card shows these as its steps and lights up the one the server says
 * is running — so the wording varies per run but the progress is genuine.
 */
export type StageKey = 'collect' | 'read' | 'extract' | 'retrieve' | 'match' | 'price' | 'assemble' | 'save';
const STAGE_POOL: Record<StageKey, string[]> = {
  collect: GEN_STAGES[0]!,
  read: GEN_STAGES[1]!,
  extract: [...GEN_STAGES[2]!, ...GEN_STAGES[3]!],
  retrieve: GEN_STAGES[5]!,
  match: GEN_STAGES[6]!,
  price: GEN_STAGES[7]!,
  assemble: GEN_STAGES[8]!,
  save: GEN_STAGES[9]!,
};
export const pickStageSteps = (): { key: StageKey; label: string }[] =>
  (Object.keys(STAGE_POOL) as StageKey[]).map((key) => ({ key, label: pickOne(STAGE_POOL[key]) }));

/** A fresh random phrasing for every stage of a chat reply. */
export const pickChatPhases = (): string[] => CHAT_STAGES.map(pickOne);
