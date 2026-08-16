/**
 * Registry of sub-apps shown as cards on the home page.
 * Adding a new tool is one entry here — the home page renders whatever it finds.
 */
export interface Tool {
  name: string;
  description: string;
  to: string;
  icon: string;
}

export const tools: Tool[] = [
  {
    name: "Family Accounting",
    description: "Track income, expenses and savings, and see where the money goes.",
    to: "/family-accounting",
    icon: "tabler:wallet",
  },
];
