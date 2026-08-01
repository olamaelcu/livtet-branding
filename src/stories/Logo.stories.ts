import type { Meta, StoryObj } from "@storybook/svelte";
import Logo from "../lib/components/Logo.svelte";

const meta = {
  title: "Components/Logo",
  component: Logo,
  tags: ["autodocs"],
  argTypes: {
    href: { control: "text" },
    width: { control: "text" },
    height: { control: "text" },
  },
} satisfies Meta<Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomHref: Story = {
  args: {
    href: "/dashboard",
  },
};

export const CustomSize: Story = {
  args: {
    width: "10rem",
    height: "10rem",
  },
};
