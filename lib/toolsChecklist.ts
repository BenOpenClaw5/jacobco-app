// Tools checklist definition — per drawer
// IDs are stable across the app so checklist_state can be persisted

export interface ChecklistItem {
  id: string;
  label: string;
}

export const TOOLS_CHECKLIST = {
  top: [
    { id: 'top-precision-bit-kit',  label: 'Precision Bit Kit' },
    { id: 'top-bit-kit-drill',      label: 'Bit Kit (Drill)' },
    { id: 'top-allen-wrench',       label: 'Allen Wrench Multi Tool' },
    { id: 'top-wire-cutters-1',     label: 'Wire Cutters — 1' },
    { id: 'top-wire-cutters-2',     label: 'Wire Cutters — 2' },
    { id: 'top-scissors',           label: 'Scissors' },
    { id: 'top-adjustable-wrench',  label: 'Adjustable Wrench' },
    { id: 'top-needle-nose',        label: 'Needle Nose Pliers' },
    { id: 'top-electrician-pliers', label: 'Electrician Pliers' },
    { id: 'top-small-flathead',     label: 'Small Flathead Screwdriver' },
    { id: 'top-phillips',           label: 'Phillips Head Screwdriver' },
    { id: 'top-razor-blade',        label: 'Razor Blade' },
    { id: 'top-small-star',         label: 'Small Star Screwdriver' },
    { id: 'top-sharpie',            label: 'Sharpie' },
    { id: 'top-extra-battery',      label: 'Extra Drill Battery' },
    { id: 'top-measuring-tape',     label: 'Measuring Tape' },
    { id: 'top-headlamp',           label: 'Headlamp' },
    { id: 'top-large-flathead',     label: 'Large Flathead Screwdriver' },
    { id: 'top-extra-blades',       label: 'Extra Blades' },
  ] satisfies ChecklistItem[],

  middle: [
    { id: 'mid-fuel-remote-1',    label: 'Fuel Remote — 1' },
    { id: 'mid-fuel-remote-2',    label: 'Fuel Remote — 2' },
    { id: 'mid-external-remote',  label: 'External Remote (in glove)' },
    { id: 'mid-astero',           label: 'Astero Controller' },
    { id: 'mid-filter-15',        label: '15° Filters' },
    { id: 'mid-filter-30',        label: '30° Filters' },
    { id: 'mid-filter-50',        label: '50° Filters' },
    { id: 'mid-power-brick',      label: 'Power Brick (USB & USB-C)' },
    { id: 'mid-usbc-cord',        label: 'USB-C Cord' },
    { id: 'mid-micro-usb',        label: 'Micro USB Cord' },
    { id: 'mid-charger-84',       label: '8.4V Charger' },
    { id: 'mid-charger-168',      label: '16.8V Charger' },
    { id: 'mid-aa-batteries',     label: 'AA Batteries' },
    { id: 'mid-airtag',           label: 'AirTag' },
    { id: 'mid-pole-tip-1',       label: 'Pole Tip — 1' },
    { id: 'mid-pole-tip-2',       label: 'Pole Tip — 2' },
  ] satisfies ChecklistItem[],

  bottom: [
    { id: 'bot-drill',              label: 'Drill' },
    { id: 'bot-alien-tape-roll',    label: 'Alien Tape Roll' },
    { id: 'bot-alien-tape-strips',  label: 'Alien Tape Precut Strips' },
    { id: 'bot-brown-gaffer',       label: 'Brown Gaffer Tape' },
    { id: 'bot-white-gaffer',       label: 'White Gaffer Tape' },
    { id: 'bot-black-gaffer',       label: 'Black Gaffer Tape' },
    { id: 'bot-drywall-screws',     label: 'Box of Drywall Screws' },
    { id: 'bot-loop-line',          label: 'Loop Line' },
    { id: 'bot-hurricane-straps',   label: 'Hurricane Straps (×20)' },
    { id: 'bot-install-head',       label: 'Install Head' },
    { id: 'bot-adjustment-head',    label: 'Adjustment Head' },
    { id: 'bot-clear-zip',          label: 'Clear Zip Ties' },
    { id: 'bot-black-zip',          label: 'Black Zip Ties' },
  ] satisfies ChecklistItem[],
};

export const ALL_CHECKLIST_ITEMS = [
  ...TOOLS_CHECKLIST.top,
  ...TOOLS_CHECKLIST.middle,
  ...TOOLS_CHECKLIST.bottom,
];

export const TOTAL_ITEMS = ALL_CHECKLIST_ITEMS.length; // 48
