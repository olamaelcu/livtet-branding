import type { Meta, StoryObj } from "@storybook/svelte";
import ThemeToggle from "../lib/components/ThemeToggle.svelte";

const meta = {
  title: "Components/ThemeToggle",
  component: ThemeToggle,
  tags: ["autodocs"],
} satisfies Meta<ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
