<page url="/docs/react/releases/v3-0-0">
# Introducing HeroUI v3

**Category**: react
**URL**: https://www.heroui.com/docs/react/releases/v3-0-0
**Source**: https://raw.githubusercontent.com/heroui-inc/heroui/refs/heads/v3/apps/docs/content/docs/react/releases/v3-0-0.mdx
> A ground-up rewrite for React and React Native. 75+ web components, 37 native components, Tailwind CSS v4, React Aria, compound architecture, and built for AI-assisted development.


<div className="flex items-center gap-3 mb-6">
  <span className="text-sm text-muted">March 2026</span>
</div>

<VideoPlayer src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/videos/heroui-v3-release.mp4" height={430} muted />

Every component rewritten. Every animation moved to CSS. Styles decoupled from implementation. A brand-new React Native library. And tooling that treats AI assistants as a primary development interface.

## Overview

### React (Web)

75+ components. [React Aria Components](https://react-aria.adobe.com/) for accessibility. Tailwind CSS v4 + CSS variables for theming. Styles in a standalone package you can use with any framework.

[Jump to details](#compound-components)

### React Native

37 components with shared design tokens, compound pattern, unified animation API, and adaptive presentation modes. Built native on each platform with [Uniwind](https://uniwind.dev/) for Tailwind CSS v4 support.

<VideoPlayer src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/videos/heroui-native-v1-release-.mp4" playMode="manual" height={430} muted />

[Jump to details](#heroui-native)

### HeroUI Pro



Premium components, templates, and AI tooling for React and React Native. Command palette, Kanban, DataGrid, Dashboard templates, and more. Pre-sale pricing at [heroui.pro](https://heroui.pro).

[Jump to details](#heroui-pro)

## Design Principles

**Composition over configuration:** v2 components were black boxes. v3 adopts compound components: every internal piece is a real element you can style, move, swap, or remove.

**Styles separated from implementation:** `@heroui/styles` is standalone CSS. `@heroui/react` handles behavior. Use the styles with React, plain HTML + Tailwind, or any framework. BEM class names make every slot customizable globally. Swap themes to change not just variables, but how components look and feel.

**Headless when you want it:** Remove the `@heroui/styles` import and you have a headless library. We maintain functionality and accessibility. You focus on your product.

**Performance by default:** v2 used Framer Motion for every animation. v3 replaced it with native CSS transitions and keyframes. Lighter bundles, GPU-accelerated, no JS animation runtime.

**Accessible from the start:** Migrated from React Aria hooks to [React Aria Components](https://react-aria.adobe.com/). Keyboard navigation, focus management, screen readers, and ARIA attributes are built in.

## Compound Components

Here's what the compound pattern looks like in practice:

```tsx
<Card>
  <Card.Header>
    <Card.Title>Product</Card.Title>
    <Card.Description>Details about this product.</Card.Description>
  </Card.Header>
  <Card.Body>
    <p>Card content goes here.</p>
  </Card.Body>
  <Card.Footer>
    <Button variant="primary">Buy now</Button>
  </Card.Footer>
</Card>

```

More lines of code. But every piece is a real element you can style, move, or replace. The pattern runs through the entire library, from Accordion to Toast.

```tsx
import {
  ArrowsRotateLeft,
  Box,
  ChevronDown,
  CreditCard,
  PlanetEarth,
  Receipt,
  ShoppingBag,
} from "@gravity-ui/icons";
import {Accordion} from "@heroui/react";

const items = [
  {
    content:
      "Browse our products, add items to your cart, and proceed to checkout. You'll need to provide shipping and payment information to complete your purchase.",
    icon: <ShoppingBag />,
    title: "How do I place an order?",
  },
  {
    content:
      "Yes, you can modify or cancel your order before it's shipped. Once your order is processed, you can't make changes.",
    icon: <Receipt />,
    title: "Can I modify or cancel my order?",
  },
  {
    content: "We accept all major credit cards, including Visa, Mastercard, and American Express.",
    icon: <CreditCard />,
    title: "What payment methods do you accept?",
  },
  {
    content:
      "Shipping costs vary based on your location and the size of your order. We offer free shipping for orders over $50.",
    icon: <Box />,
    title: "How much does shipping cost?",
  },
  {
    content:
      "Yes, we ship to most countries. Please check our shipping rates and policies for more information.",
    icon: <PlanetEarth />,
    title: "Do you ship internationally?",
  },
  {
    content:
      "If you're not satisfied with your purchase, you can request a refund within 30 days of purchase. Please contact our customer support team for assistance.",
    icon: <ArrowsRotateLeft />,
    title: "How do I request a refund?",
  },
];

export function Basic() {
  return (
    <Accordion className="w-full max-w-md">
      {items.map((item, index) => (
        <Accordion.Item key={index}>
          <Accordion.Heading>
            <Accordion.Trigger>
              {item.icon ? (
                <span className="mr-3 size-4 shrink-0 text-muted">{item.icon}</span>
              ) : null}
              {item.title}
              <Accordion.Indicator>
                <ChevronDown />
              </Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body>{item.content}</Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

```

Each compound component shares state through React context. The root component creates a style context, and every child consumes it. You never pass classNames down manually:

```tsx
<Alert status="success">
  <Alert.Indicator />
  <Alert.Content>
    <Alert.Title>Profile updated</Alert.Title>
    <Alert.Description>Your changes have been saved.</Alert.Description>
  </Alert.Content>
</Alert>

```

```tsx
import {Alert, Button, CloseButton, Spinner} from "@heroui/react";
import React from "react";

export function Basic() {
  return (
    <div className="grid w-full max-w-xl gap-4">
      {/* Default - General information */}
      <Alert>
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>New features available</Alert.Title>
          <Alert.Description>
            Check out our latest updates including dark mode support and improved accessibility
            features.
          </Alert.Description>
        </Alert.Content>
      </Alert>

      {/* Accent - Important information with action */}
      <Alert status="accent">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Update available</Alert.Title>
          <Alert.Description>
            A new version of the application is available. Please refresh to get the latest features
            and bug fixes.
          </Alert.Description>
          <Button className="mt-2 sm:hidden" size="sm" variant="primary">
            Refresh
          </Button>
        </Alert.Content>
        <Button className="hidden sm:block" size="sm" variant="primary">
          Refresh
        </Button>
      </Alert>

      {/* Danger - Error with detailed steps */}
      <Alert status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Unable to connect to server</Alert.Title>
          <Alert.Description>
            We're experiencing connection issues. Please try the following:
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
              <li>Check your internet connection</li>
              <li>Refresh the page</li>
              <li>Clear your browser cache</li>
            </ul>
          </Alert.Description>
          <Button className="mt-2 sm:hidden" size="sm" variant="danger">
            Retry
          </Button>
        </Alert.Content>
        <Button className="hidden sm:block" size="sm" variant="danger">
          Retry
        </Button>
      </Alert>

      {/* Without description */}
      <Alert status="success">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Profile updated successfully</Alert.Title>
        </Alert.Content>
        <CloseButton />
      </Alert>

      {/* Custom indicator - Loading state */}
      <Alert status="accent">
        <Alert.Indicator>
          <Spinner size="sm" />
        </Alert.Indicator>
        <Alert.Content>
          <Alert.Title>Processing your request</Alert.Title>
          <Alert.Description>
            Please wait while we sync your data. This may take a few moments.
          </Alert.Description>
        </Alert.Content>
      </Alert>

      {/* Without close button */}
      <Alert status="warning">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Scheduled maintenance</Alert.Title>
          <Alert.Description>
            Our services will be unavailable on Sunday, March 15th from 2:00 AM to 6:00 AM UTC for
            scheduled maintenance.
          </Alert.Description>
        </Alert.Content>
      </Alert>
    </div>
  );
}

```

### Progressive Disclosure

Components support both simple and compound usage. Start with the one-liner. Add structure when you need it:

```tsx
// One line
<Button>Submit</Button>

// With icon
<Button>
  <Icon icon="gravity-ui:check" />
  Submit
</Button>

// Full control
<Button variant="primary" size="lg" isDisabled={isLoading}>
  {isLoading ? <Spinner size="sm" /> : <Icon icon="gravity-ui:check" />}
  {isLoading ? "Saving..." : "Submit"}
</Button>

```

```tsx
import {Button} from "@heroui/react";

export function Variants() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="tertiary">Tertiary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="danger-soft">Danger Soft</Button>
    </div>
  );
}

```

## Tailwind CSS v4 + CSS Variables

Theming runs on Tailwind CSS v4's native CSS variable layer with OKLCH colors. Every design token is a CSS variable:

```css
:root {
  --background: oklch(0.9702 0 0);
  --foreground: oklch(0.2103 0.0059 285.89);
  --accent: oklch(0.6204 0.195 253.83);
  --surface: oklch(100% 0 0);
  --danger: oklch(0.6532 0.2328 25.74);
  --radius: 0.5rem;
}

```

Tailwind's `@theme` directive maps these tokens to utility classes. `bg-accent`, `text-foreground`, `rounded-lg` all resolve to CSS variables. Light and dark mode switch by swapping the values:

```css
.dark, [data-theme="dark"] {
  --background: oklch(12% 0.005 285.823);
  --foreground: oklch(0.9911 0 0);
  --surface: oklch(0.2103 0.0059 285.89);
}

```

No provider component. No JavaScript theme object. One CSS import, two lines:

```css
@import "tailwindcss";
@import "@heroui/styles";

```

### BEM Classes

Override any component globally through standard CSS:

```css
@layer components {
  .button {
    @apply font-semibold tracking-wide;
  }

  .button--primary {
    @apply bg-blue-600 hover:bg-blue-700;
  }
}

```

No className threading. No style prop gymnastics. Your design system overrides happen in CSS, where they belong.

### Custom Themes

Create a theme by defining your own token set. Everything cascades from there:

```css
@layer base {
  [data-theme="ocean"] {
    --accent: oklch(0.450 0.150 230);
    --background: oklch(0.985 0.015 225);
    --radius: 0.75rem;
    --border: oklch(0.50 0.060 230 / 22%);
  }
}

```

Apply it with a single data attribute:

```html
<html data-theme="ocean">

```

The [Theme Builder](/themes) generates these variables visually. Pick colors, adjust radius and spacing, export the CSS.

### Selective Imports

Import the full library or pick individual component styles:

```css
@import "tailwindcss";
@import "@heroui/styles/base" layer(base);
@import "@heroui/styles/themes/default" layer(theme);
@import "@heroui/styles/components/button.css" layer(components);
@import "@heroui/styles/components/card.css" layer(components);

```

Ship only the CSS you use. No unused component styles in production.

## Animation That Respects Users

All component animations use CSS transitions and keyframes tied to data attributes. Popovers fade in with `[data-entering]`. Buttons scale on `[data-pressed]`. Accordions expand with `[aria-hidden="false"]`.

```css
.popover[data-entering] {
  @apply animate-in zoom-in-90 fade-in-0 duration-200;
}

.button:active,
.button[data-pressed="true"] {
  transform: scale(0.97);
}

```

### Reduce Motion

Some users need animations disabled. HeroUI extends Tailwind's `motion-reduce:` variant to support both the system preference and a data attribute:

```css
.button {
  @apply transition-colors motion-reduce:transition-none;
}

```

This responds to the native `prefers-reduced-motion: reduce` media query. It also responds to `data-reduce-motion="true"` on the HTML element, for app-level control:

```html
<html data-reduce-motion="true">
  <!-- All HeroUI animations are disabled -->
</html>

```

The data attribute overrides the system setting. Set `data-reduce-motion="false"` to force animations on, or remove the attribute to defer to the OS. Every animated component respects this. No opt-in required.

### Bring Your Own Animation Library

Framer Motion, Motion One, or any CSS animation library works alongside HeroUI's built-in transitions:

```tsx
import { motion } from "framer-motion";
import { Button } from "@heroui/react";

const MotionButton = motion(Button);

<MotionButton whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
  Animated
</MotionButton>

```

## 75+ Components for React

### Date & Time

Six components: Calendar, RangeCalendar, DateField, DatePicker, DateRangePicker, and TimeField. Built on React Aria's internationalized date library with Gregorian, Buddhist, Persian, and other calendar systems by default. Keyboard navigation, screen reader labels, and locale-aware formatting come free.

```tsx
"use client";

import {Calendar, DateField, DatePicker, Label} from "@heroui/react";

export function Basic() {
  return (
    <DatePicker className="w-64" name="date">
      <Label>Date</Label>
      <DateField.Group fullWidth>
        <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger>
            <DatePicker.TriggerIndicator />
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <DatePicker.Popover>
        <Calendar aria-label="Event date">
          <Calendar.Header>
            <Calendar.YearPickerTrigger>
              <Calendar.YearPickerTriggerHeading />
              <Calendar.YearPickerTriggerIndicator />
            </Calendar.YearPickerTrigger>
            <Calendar.NavButton slot="previous" />
            <Calendar.NavButton slot="next" />
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader>
              {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
            </Calendar.GridHeader>
            <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
          </Calendar.Grid>
          <Calendar.YearPickerGrid>
            <Calendar.YearPickerGridBody>
              {({year}) => <Calendar.YearPickerCell year={year} />}
            </Calendar.YearPickerGridBody>
          </Calendar.YearPickerGrid>
        </Calendar>
      </DatePicker.Popover>
    </DatePicker>
  );
}

```

```tsx
"use client";

import {RangeCalendar} from "@heroui/react";

export function Basic() {
  return (
    <RangeCalendar aria-label="Trip dates" firstDayOfWeek="mon">
      <RangeCalendar.Header>
        <RangeCalendar.Heading />
        <RangeCalendar.NavButton slot="previous" />
        <RangeCalendar.NavButton slot="next" />
      </RangeCalendar.Header>
      <RangeCalendar.Grid>
        <RangeCalendar.GridHeader>
          {(day) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}
        </RangeCalendar.GridHeader>
        <RangeCalendar.GridBody>
          {(date) => <RangeCalendar.Cell date={date} />}
        </RangeCalendar.GridBody>
      </RangeCalendar.Grid>
    </RangeCalendar>
  );
}

```

### Color

Six color components: ColorPicker, ColorArea, ColorSlider, ColorField, ColorSwatch, and ColorSwatchPicker. Pick from a 2D area, adjust hue and alpha sliders, enter hex values, or select from a swatch palette.

```tsx
import {ColorArea, ColorPicker, ColorSlider, ColorSwatch, Label} from "@heroui/react";

export function Basic() {
  return (
    <ColorPicker defaultValue="#0485F7">
      <ColorPicker.Trigger>
        <ColorSwatch size="lg" />
        <Label>Pick a color</Label>
      </ColorPicker.Trigger>
      <ColorPicker.Popover>
        <ColorArea
          aria-label="Color area"
          className="max-w-full"
          colorSpace="hsb"
          xChannel="saturation"
          yChannel="brightness"
        >
          <ColorArea.Thumb />
        </ColorArea>
        <ColorSlider channel="hue" className="gap-1 px-1" colorSpace="hsb">
          <Label>Hue</Label>
          <ColorSlider.Output className="text-muted" />
          <ColorSlider.Track>
            <ColorSlider.Thumb />
          </ColorSlider.Track>
        </ColorSlider>
      </ColorPicker.Popover>
    </ColorPicker>
  );
}

```

### Data

Need a table with sorting, row selection, column resizing, async loading, and custom cells? Table does all of that. Large datasets get virtualization via React Aria's `Virtualizer`. ListBox shares the same virtualization support.

```tsx
"use client";

import {Table, TableLayout, Virtualizer} from "@heroui/react";

interface User {
  id: number;
  name: string;
  role: string;
  email: string;
}

export function Virtualization() {
  const roles = [
    "Software Engineer",
    "Senior Engineer",
    "Staff Engineer",
    "Product Manager",
    "Designer",
    "Data Analyst",
    "QA Engineer",
    "DevOps Engineer",
    "Marketing Manager",
    "Sales Representative",
  ];

  const firstNames = [
    "Emma",
    "Liam",
    "Olivia",
    "Noah",
    "Ava",
    "James",
    "Sophia",
    "Oliver",
    "Isabella",
    "Lucas",
    "Mia",
    "Ethan",
    "Charlotte",
    "Mason",
    "Amelia",
    "Logan",
    "Harper",
    "Alexander",
    "Ella",
    "Benjamin",
  ];

  const lastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
    "Rodriguez",
    "Martinez",
    "Anderson",
    "Taylor",
    "Thomas",
    "Jackson",
    "White",
    "Harris",
    "Clark",
    "Lewis",
    "Robinson",
    "Walker",
  ];

  function generateUsers(count: number): User[] {
    const users: User[] = [];

    for (let i = 0; i < count; i++) {
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
      const name = `${firstName} ${lastName}`;

      users.push({
        email: `${firstName?.toLowerCase()}.${lastName?.toLowerCase()}@acme.com`,
        id: i + 1,
        name,
        role: roles[i % roles.length] || "",
      });
    }

    return users;
  }

  const virtualizedUsers = generateUsers(1000);

  return (
    <Virtualizer
      layout={TableLayout}
      layoutOptions={{
        headingHeight: 42,
        rowHeight: 42,
      }}
    >
      <Table>
        <Table.ScrollContainer>
          <Table.Content
            aria-label="Virtualized table with 1000 rows"
            className="h-[300px] min-w-[700px] overflow-auto"
          >
            <Table.Header className="h-full w-full">
              <Table.Column isRowHeader id="name" minWidth={160}>
                Name
              </Table.Column>
              <Table.Column id="role" minWidth={220}>
                Role
              </Table.Column>
              <Table.Column id="email" minWidth={240}>
                Email
              </Table.Column>
            </Table.Header>
            <Table.Body items={virtualizedUsers}>
              {(user) => (
                <Table.Row>
                  <Table.Cell>{user.name}</Table.Cell>
                  <Table.Cell>{user.role}</Table.Cell>
                  <Table.Cell>{user.email}</Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    </Virtualizer>
  );
}

```

### Forms

Thirteen form components: TextField, Select, Autocomplete, ComboBox, Checkbox, CheckboxGroup, RadioGroup, Switch, InputOTP, NumberField, SearchField, Slider, and Fieldset. All integrate with React Aria's form validation. `isRequired`, `isInvalid`, and custom error messages through FieldError work across every one.

```tsx
import {Label, ListBox, Select} from "@heroui/react";

export function Default() {
  return (
    <Select className="w-[256px]" placeholder="Select one">
      <Label>State</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          <ListBox.Item id="florida" textValue="Florida">
            Florida
            <ListBox.ItemIndicator />
          </ListBox.Item>
          <ListBox.Item id="delaware" textValue="Delaware">
            Delaware
            <ListBox.ItemIndicator />
          </ListBox.Item>
          <ListBox.Item id="california" textValue="California">
            California
            <ListBox.ItemIndicator />
          </ListBox.Item>
          <ListBox.Item id="texas" textValue="Texas">
            Texas
            <ListBox.ItemIndicator />
          </ListBox.Item>
          <ListBox.Item id="new-york" textValue="New York">
            New York
            <ListBox.ItemIndicator />
          </ListBox.Item>
          <ListBox.Item id="washington" textValue="Washington">
            Washington
            <ListBox.ItemIndicator />
          </ListBox.Item>
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

```

```tsx
import {InputOTP, Label, Link} from "@heroui/react";

export function Basic() {
  return (
    <div className="flex w-[280px] flex-col gap-2">
      <div className="flex flex-col gap-1">
        <Label>Verify account</Label>
        <p className="text-sm text-muted">We&apos;ve sent a code to a****@gmail.com</p>
      </div>
      <InputOTP maxLength={6}>
        <InputOTP.Group>
          <InputOTP.Slot index={0} />
          <InputOTP.Slot index={1} />
          <InputOTP.Slot index={2} />
        </InputOTP.Group>
        <InputOTP.Separator />
        <InputOTP.Group>
          <InputOTP.Slot index={3} />
          <InputOTP.Slot index={4} />
          <InputOTP.Slot index={5} />
        </InputOTP.Group>
      </InputOTP>
      <div className="flex items-center gap-[5px] px-1 pt-1">
        <p className="text-sm text-muted">Didn&apos;t receive a code?</p>
        <Link className="text-foreground underline" href="#">
          Resend
        </Link>
      </div>
    </div>
  );
}

```

### Overlays

Seven overlay components. Drawer supports four placements with drag-to-dismiss gestures. Toast stacks notifications with auto-dismiss and promise support. Menu composes with submenus and sections. Plus Modal, AlertDialog, Popover, and Tooltip.

```tsx
import {Button, Drawer} from "@heroui/react";

export function Basic() {
  return (
    <Drawer>
      <Button variant="secondary">Open Drawer</Button>
      <Drawer.Backdrop>
        <Drawer.Content placement="right">
          <Drawer.Dialog>
            <Drawer.Header>
              <Drawer.Heading>Drawer Title</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body>
              <p>
                This is a bottom drawer built with React Aria's Modal component. It slides up from
                the bottom of the screen with a smooth CSS transition.
              </p>
            </Drawer.Body>
            <Drawer.Footer>
              <Button slot="close" variant="secondary">
                Cancel
              </Button>
              <Button slot="close">Confirm</Button>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}

```

```tsx
"use client";

import {Persons} from "@gravity-ui/icons";
import {Button, toast} from "@heroui/react";

export function Default() {
  return (
    <div className="flex h-full max-w-xl flex-col items-center justify-center">
      <Button
        size="sm"
        variant="secondary"
        onPress={() => {
          toast("You have been invited to join a team", {
            actionProps: {
              children: "Dismiss",
              onPress: () => toast.clear(),
              variant: "tertiary",
            },
            description: "Bob sent you an invitation to join HeroUI team",
            indicator: <Persons />,
            variant: "default",
          });
        }}
      >
        Show toast
      </Button>
    </div>
  );
}

```

### Navigation

Tabs, Accordion, Breadcrumbs, Pagination, and Link. Tabs support horizontal and vertical orientation. Accordion supports single or multiple expanded panels.

```tsx
import {Tabs} from "@heroui/react";

export function Basic() {
  return (
    <Tabs className="w-full max-w-md">
      <Tabs.ListContainer>
        <Tabs.List aria-label="Options">
          <Tabs.Tab id="overview">
            Overview
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab id="analytics">
            Analytics
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab id="reports">
            Reports
            <Tabs.Indicator />
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.ListContainer>
      <Tabs.Panel className="pt-4" id="overview">
        <p>View your project overview and recent activity.</p>
      </Tabs.Panel>
      <Tabs.Panel className="pt-4" id="analytics">
        <p>Track your metrics and analyze performance data.</p>
      </Tabs.Panel>
      <Tabs.Panel className="pt-4" id="reports">
        <p>Generate and download detailed reports.</p>
      </Tabs.Panel>
    </Tabs>
  );
}

```

### Feedback

ProgressBar and ProgressCircle handle determinate + indeterminate states. Meter maps values to semantic colors: green for safe, yellow for cautious, red for critical. Skeleton and Spinner round out the set.

```tsx
import {Label, Meter} from "@heroui/react";

export function Colors() {
  return (
    <div className="flex w-64 flex-col gap-6">
      <Meter color="default" value={50}>
        <Label>Default</Label>
        <Meter.Output />
        <Meter.Track>
          <Meter.Fill />
        </Meter.Track>
      </Meter>
      <Meter color="accent" value={50}>
        <Label>Accent</Label>
        <Meter.Output />
        <Meter.Track>
          <Meter.Fill />
        </Meter.Track>
      </Meter>
      <Meter color="success" value={50}>
        <Label>Success</Label>
        <Meter.Output />
        <Meter.Track>
          <Meter.Fill />
        </Meter.Track>
      </Meter>
      <Meter color="warning" value={50}>
        <Label>Warning</Label>
        <Meter.Output />
        <Meter.Track>
          <Meter.Fill />
        </Meter.Track>
      </Meter>
      <Meter color="danger" value={50}>
        <Label>Danger</Label>
        <Meter.Output />
        <Meter.Track>
          <Meter.Fill />
        </Meter.Track>
      </Meter>
    </div>
  );
}

```

```tsx
import {Skeleton} from "@heroui/react";

export function Basic() {
  return (
    <div className="shadow-panel w-[250px] space-y-5 rounded-lg bg-transparent p-4">
      <Skeleton className="h-32 rounded-lg" />
      <div className="space-y-3">
        <Skeleton className="h-3 w-3/5 rounded-lg" />
        <Skeleton className="h-3 w-4/5 rounded-lg" />
        <Skeleton className="h-3 w-2/5 rounded-lg" />
      </div>
    </div>
  );
}

```

### Buttons & Toggles

Button, ButtonGroup, ToggleButton, ToggleButtonGroup, CloseButton, and Toolbar. ButtonGroup connects buttons with shared borders and supports vertical orientation. Toolbar groups buttons, toggles, and separators into an accessible `role="toolbar"` container.

```tsx
import {Bold, Italic, Strikethrough, Underline} from "@gravity-ui/icons";
import {ToggleButton, ToggleButtonGroup} from "@heroui/react";

export function Attached() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted">Attached (default)</span>
        <ToggleButtonGroup selectionMode="multiple">
          <ToggleButton isIconOnly aria-label="Bold" id="bold">
            <Bold />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label="Italic" id="italic">
            <ToggleButtonGroup.Separator />
            <Italic />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label="Underline" id="underline">
            <ToggleButtonGroup.Separator />
            <Underline />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label="Strikethrough" id="strikethrough">
            <ToggleButtonGroup.Separator />
            <Strikethrough />
          </ToggleButton>
        </ToggleButtonGroup>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted">Detached</span>
        <ToggleButtonGroup isDetached selectionMode="multiple">
          <ToggleButton isIconOnly aria-label="Bold" id="bold">
            <Bold />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label="Italic" id="italic">
            <Italic />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label="Underline" id="underline">
            <Underline />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label="Strikethrough" id="strikethrough">
            <Strikethrough />
          </ToggleButton>
        </ToggleButtonGroup>
      </div>
    </div>
  );
}

```

### Granular Imports

Import from the root or from per-component subpaths. Both work:

```tsx
// Root import
import { Button, Card, Table } from "@heroui/react";

// Subpath import
import { Button } from "@heroui/react/button";
import { Card } from "@heroui/react/card";
import { Table } from "@heroui/react/table";

```

## UI for Agents

More developers build by prompting than by reading API docs. HeroUI v3 accounts for that.

### MCP Server

The HeroUI MCP Server connects AI coding assistants (Cursor, Claude Code, VS Code Copilot, Windsurf, Zed) to component docs, props, source code, CSS styles, and theme variables. The AI reads the source of truth directly instead of guessing from training data.

```json
{
  "mcpServers": {
    "heroui-react": {
      "command": "npx",
      "args": ["-y", "@heroui/react-mcp@latest"]
    }
  }
}

```

Ask your AI assistant "update HeroUI to the latest version" and it will compare versions, review the changelog for breaking changes, and apply the necessary code updates automatically.

### Agent Skills

Installable knowledge packs for Cursor and Claude Code. Component patterns, variant usage, theming instructions, and upgrade guides. Preloaded context so the AI writes correct HeroUI code on the first attempt.

### LLMs.txt

Structured documentation files optimized for AI context windows. Published at `/llms.txt` and `/llms-components.txt`, these give any LLM-powered tool a machine-readable summary of HeroUI's API surface.

MCP server, agent skills, LLMs.txt. Three layers that give AI assistants the same access to HeroUI that human developers get from docs.

## HeroUI Native

<VideoPlayer src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/videos/heroui-native-v1-release-.mp4" height={430} muted />

HeroUI Native is a brand-new library shipping alongside v3 for the web. Different rendering engine, same mental model. Where the platforms diverge, the APIs adapt to feel native on each.

### Try It on Your Device

Scan the QR code with your device's camera or [Expo Go](https://expo.dev/go) to explore all 37 components live:

<div className="flex justify-center my-6">
  <img width="200" src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/images/qr-code-native.png" alt="Expo Go QR Code" />
</div>

<div className="flex justify-center">
  **[📱 Open Demo App in Expo Go](https://link.heroui.com/native-demo)**
</div>

<Callout type="info">
  **Android users:** If scanning the QR code redirects to a browser and shows a 404 error, open Expo Go first and use its built-in QR scanner instead.
</Callout>

### 37 Components

Forms, navigation, overlays, feedback, layout. From Button, Input, and Checkbox to Dialog, BottomSheet, Select, Toast, and InputOTP. Components follow the compound pattern:

```tsx
import { Dialog, Button } from "heroui-native";

<Dialog>
  <Dialog.Trigger asChild>
    <Button variant="primary">Open</Button>
  </Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content>
      <Dialog.Close />
      <Dialog.Title>Confirm action</Dialog.Title>
      <Dialog.Description>This cannot be undone.</Dialog.Description>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog>

```

### Familiar Across Platforms

If you know HeroUI on the web, most of that knowledge carries over. Familiar component names, dot notation, and prop patterns wherever possible. Where the platforms diverge (layout primitives, gestures, navigation), the APIs adapt to feel native. The mental model stays the same:

```tsx
// React (web)
<Alert status="success">
  <Alert.Indicator />
  <Alert.Content>
    <Alert.Title>Profile updated</Alert.Title>
    <Alert.Description>Your changes have been saved.</Alert.Description>
  </Alert.Content>
</Alert>

// React Native — similar API, native behavior
<Alert status="success">
  <Alert.Indicator />
  <Alert.Content>
    <Alert.Title>Profile updated</Alert.Title>
    <Alert.Description>Your changes have been saved.</Alert.Description>
  </Alert.Content>
</Alert>

```

Teams working on both web and mobile share knowledge and patterns. The learning curve between platforms is minimal, even where the components differ.

### Shared Design Tokens

Both platforms read from the same token set. Colors like `accent`, `surface`, `danger`, and `success` resolve identically across web and native. Your brand stays consistent without maintaining two separate systems.

```tsx
import { View, Text } from "react-native";

<View className="bg-surface p-4 rounded-lg">
  <Text className="text-foreground text-lg font-semibold">Card Title</Text>
  <Text className="text-muted text-sm">Consistent on web and mobile.</Text>
</View>

```

Tailwind CSS v4 on both platforms. [Uniwind](https://uniwind.dev/) on native, standard Tailwind on web.

<VideoPlayer src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/videos/native-v1-demo/v-1-demo-2.mp4" height={430} muted />

### Unified Animation API

Every animated native component exposes a single `animation` prop. Values, timing, spring configs, enter/exit transitions controlled from one place. Reanimated powers the math, but you never touch it directly:

```tsx
import { Switch } from "heroui-native";

<Switch
  animation={{
    scale: { value: [1, 0.9] },
    backgroundColor: { value: ["#172554", "#eab308"] },
  }}
>
  <Switch.Thumb />
</Switch>

```

Disable animations at any level. Per-component, per-tree, or globally:

```tsx
// Single component
<Switch.Thumb animation={false} />

// Entire subtree
<Card animation="disable-all">...</Card>

// App-wide
<HeroUINativeProvider config={{ animation: "disable-all" }}>
  <App />
</HeroUINativeProvider>

```

Reduce Motion is automatic. When a user enables it in system settings, all animations stop. No extra code.

### Adaptive Presentation Modes

Popover, Select, and Menu switch between popover, bottom-sheet, and dialog with a single prop. Same component, different presentation depending on context:

```tsx
<Select presentation="popover">...</Select>
<Select presentation="bottom-sheet">...</Select>
<Select presentation="dialog">...</Select>

```

No other React Native component library does this.

<VideoPlayer src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/videos/native-v1-demo/v-1-demo-3.mp4" height={430} muted />

### Granular Imports

Each native component has its own entry point. Import only what you use:

```tsx
import { HeroUINativeProvider } from "heroui-native/provider";
import { Button } from "heroui-native/button";
import { Card } from "heroui-native/card";

```

### AI Tooling for Native

HeroUI Native ships with its own MCP Server, agent skills, and LLMs.txt. Same tooling structure as the web library:

```json
{
  "mcpServers": {
    "heroui-native": {
      "command": "npx",
      "args": ["-y", "@heroui/native-mcp@latest"]
    }
  }
}

```

## HeroUI Pro



Alongside v3, the pre-sale of [HeroUI Pro](https://heroui.pro) is live. Premium components, templates, and AI tooling for both React and React Native.

### Pro Components

Components beyond the core library: Command palette, Kanban board, Stats dashboard, Filters, Agenda, DataGrid, and more. Accessibility, animations, and platform edge cases are handled. Will be available for both Web and Native.

### Templates

Full-page, responsive starter templates: Dashboard, Mail, Chat, and Finances. Real layouts with real structure. Start from something that works and customize from there.

### Advanced AI Tooling

Pro licenses include premium MCP servers and agent skills with Pro component docs, usage patterns, and upgrade paths baked in.

Pre-sale pricing is live. v2 Pro customers get an upgrade discount. Use the same email or contact support.

[See plans and pricing at heroui.pro](https://heroui.pro)

## Get Started

### React (Web)

<Tabs items={["npm", "pnpm", "yarn", "bun"]}>
  <Tab value="npm">
    ```bash
    npm i @heroui/styles @heroui/react
    ```
  </Tab>

  <Tab value="pnpm">
    ```bash
    pnpm add @heroui/styles @heroui/react
    ```
  </Tab>

  <Tab value="yarn">
    ```bash
    yarn add @heroui/styles @heroui/react
    ```
  </Tab>

  <Tab value="bun">
    ```bash
    bun add @heroui/styles @heroui/react
    ```
  </Tab>
</Tabs>

Add two lines to your CSS:

```css
@import "tailwindcss";
@import "@heroui/styles";

```

### React Native

<Tabs items={["npm", "pnpm", "yarn", "bun"]}>
  <Tab value="npm">
    ```bash
    npm install heroui-native
    ```
  </Tab>

  <Tab value="pnpm">
    ```bash
    pnpm add heroui-native
    ```
  </Tab>

  <Tab value="yarn">
    ```bash
    yarn add heroui-native
    ```
  </Tab>

  <Tab value="bun">
    ```bash
    bun add heroui-native
    ```
  </Tab>
</Tabs>

See the [React docs](/docs/react/getting-started/quick-start) and [React Native docs](/docs/native/getting-started/quick-start) for full setup guides (peer dependencies, Uniwind config, and provider setup).

**Coming from HeroUI v2?** Follow the [Migration Guide](/docs/react/migration) for step-by-step upgrade instructions.

## Figma Kit v3

Every component in HeroUI v3 has a 1:1 match in Figma. Same variants, same naming, same structure. The kit uses auto layout throughout, Figma variables that map directly to code tokens (`--accent`, `--surface`, `--radius`), and Figma's new [slots](https://help.figma.com/hc/en-us/articles/38231200344599-Use-slots-to-build-flexible-components-in-Figma) for flexible component composition. Designers rearrange, swap, and customize parts the same way developers do in code.



[Get the Figma Kit](https://www.figma.com/community/file/1546526812159103429/heroui-figma-kit-v3)

## Acknowledgments

[React Aria](https://react-aria.adobe.com/) gave us the accessibility layer we couldn't build as well on our own. Tailwind CSS v4's native CSS variable approach shaped the entire theming system. The compound component pattern was refined by studying how [Radix](https://www.radix-ui.com/), [Ark UI](https://ark-ui.com/), and [Base UI](https://base-ui.com/) solved composition.

Thanks to every community member who filed issues, tested betas, and gave feedback throughout the alpha and RC cycle. The library is better because of you.

## Links

* [React Docs](/docs/react/getting-started/quick-start)
* [React Native Docs](/docs/native/getting-started/quick-start)
* [Theme Builder](/themes)
* [MCP Server](/docs/ui-for-agents/mcp-server)
* [GitHub Repository](https://github.com/heroui-inc/heroui)
* [Figma Kit V3](https://www.figma.com/community/file/1546526812159103429/heroui-figma-kit-v3)

</page>