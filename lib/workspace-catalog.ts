export interface DesignSystemPreset {
  id: string
  name: string
  description: string
  instructions: string
  category: 'DS 2.0' | 'Legacy' | 'Custom'
}

export interface AppTemplate {
  id: string
  name: string
  category: string
  description: string
  prompt: string
  tags: string[]
  source?: {
    name: string
    url: string
    license: 'MIT'
    referenceFiles?: string[]
    agentInstructions: string
    branch: string
  }
}

export interface ComponentKit {
  id: string
  name: string
  description: string
  prompt: string
  source: {
    name: string
    url: string
    license: 'MIT'
    referenceFiles?: string[]
  }
  agentInstructions: string
}

export const builtInDesignSystems: DesignSystemPreset[] = [
  {
    id: 'primer',
    name: 'Primer',
    description: "GitHub's open-source design system.",
    instructions:
      'Use GitHub Primer as visual direction: restrained neutral surfaces, clear hierarchy, accessible contrast, compact controls, and consistent spacing. Implement with the dependencies already installed; do not assume Primer packages are present.',
    category: 'DS 2.0',
  },
  {
    id: 'carbon',
    name: 'Carbon',
    description: "IBM's open-source design system.",
    instructions:
      'Use IBM Carbon as visual direction: structured grid, functional typography, neutral base colors, deliberate blue accents, clear focus states, and dense but readable data layouts. Reuse installed dependencies only.',
    category: 'DS 2.0',
  },
  {
    id: 'material-3',
    name: 'Material 3',
    description: "Google's Material design guidance.",
    instructions:
      'Use Material 3 as visual direction: expressive color roles, rounded surfaces, clear elevation, responsive components, accessible states, and a coherent type scale. Reuse installed dependencies only.',
    category: 'DS 2.0',
  },
  {
    id: 'fluent-ui',
    name: 'Fluent UI',
    description: "Microsoft's Fluent design guidance.",
    instructions:
      'Use Microsoft Fluent as visual direction: calm surfaces, subtle depth, fluent spacing, crisp typography, restrained accent color, and polished keyboard/focus states. Reuse installed dependencies only.',
    category: 'DS 2.0',
  },
  {
    id: 'cloudscape',
    name: 'Cloudscape',
    description: "AWS's open-source design system.",
    instructions:
      'Use AWS Cloudscape as visual direction: information-dense layouts, practical navigation, clear status colors, accessible forms, and strong data readability. Reuse installed dependencies only.',
    category: 'DS 2.0',
  },
  {
    id: 'shadcn',
    name: 'shadcn/ui',
    description: 'Composable, accessible interface patterns.',
    instructions:
      'Use shadcn/ui conventions: accessible primitives, crisp borders, restrained color, thoughtful radius, and clear interaction states. Prefer existing project components and dependencies; do not add packages unless the task explicitly requires them.',
    category: 'Legacy',
  },
]

export const appTemplates: AppTemplate[] = [
  {
    id: 'saas-dashboard',
    name: 'SaaS analytics dashboard',
    category: 'Dashboards',
    description:
      'A complete analytics workspace with KPIs, charts, filters, and responsive navigation.',
    prompt:
      'Build a polished SaaS analytics dashboard with a responsive sidebar, KPI cards, interactive charts, date-range filters, recent activity, and realistic sample data. Include reusable components and fully populated supporting files.',
    tags: ['Analytics', 'SaaS', 'Charts'],
    source: {
      name: 'Next Shadcn Dashboard Starter',
      url: 'https://github.com/Kiranism/next-shadcn-dashboard-starter',
      license: 'MIT',
      referenceFiles: [
        'src/features/overview/components/overview.tsx',
        'src/components/ui/card.tsx',
      ],
      agentInstructions:
        'This is an imported, complete MIT-licensed Kiranism/next-shadcn-dashboard-starter. Inspect and modify the seeded project files directly to fulfill the request rather than generating an unrelated project. Preserve upstream copyright/license notices in files copied or substantially reused.',
      branch: 'main',
    },
  },
  {
    id: 'product-landing',
    name: 'Product landing page',
    category: 'Landing Pages',
    description:
      'A high-conversion marketing site with a strong hero, feature story, and pricing.',
    prompt:
      'Build a polished, responsive product landing page with a distinctive hero, navigation, feature sections, social proof, pricing, FAQ, and a clear call to action. Use realistic copy and working interactions.',
    tags: ['Marketing', 'Responsive', 'Conversion'],
    source: {
      name: 'shadcn Landing Page',
      url: 'https://github.com/leoMirandaa/shadcn-landing-page',
      license: 'MIT',
      agentInstructions:
        'This is an imported, complete MIT-licensed leoMirandaa/shadcn-landing-page. Inspect and modify the seeded project files directly to fulfill the request rather than generating an unrelated project. Preserve upstream copyright/license notices in files copied or substantially reused.',
      branch: 'main',
    },
  },
  {
    id: 'commerce-store',
    name: 'E-commerce storefront',
    category: 'E-commerce',
    description:
      'A product catalog and shopping experience with filters, detail views, and cart.',
    prompt:
      'Build a responsive e-commerce storefront with product search, category filters, product cards, product details, cart interactions, and realistic inventory and pricing. Use reusable components and accessible controls.',
    tags: ['Store', 'Products', 'Cart'],
    source: {
      name: 'Relivator',
      url: 'https://github.com/reliverse/relivator',
      license: 'MIT',
      agentInstructions:
        'This is an imported, complete MIT-licensed Reliverse/relivator project. Inspect and modify the seeded project files directly to fulfill the request rather than generating an unrelated project. Do not expose or reuse credentials, provider configuration, or unrelated infrastructure. Preserve upstream copyright/license notices in files copied or substantially reused.',
      branch: 'main',
    },
  },
  {
    id: 'startup-saas',
    name: 'Startup and SaaS website',
    category: 'Landing Pages',
    description:
      'A complete business website starter with startup and SaaS sections and pages.',
    prompt:
      'Use this imported MIT-licensed Next.js startup template as the starting codebase. First inspect the existing files and dependencies, then adapt the actual project into a polished startup/SaaS website tailored to my request. Preserve the existing framework structure where practical, make all requested interactions functional, and retain the original license notices for any reused code.',
    tags: ['Startup', 'SaaS', 'Business'],
    source: {
      name: 'Next.js Startup Template',
      url: 'https://github.com/NextJSTemplates/startup-nextjs',
      license: 'MIT',
      agentInstructions:
        'This is an imported, complete MIT-licensed Next.js startup template. Inspect and modify the seeded project files directly rather than generating an unrelated project. Preserve upstream copyright/license notices in files copied or substantially reused. The upstream free version does not include the paid integrations described by its author; do not claim those integrations exist.',
      branch: 'main',
    },
  },
  {
    id: 'ai-chat',
    name: 'AI chat workspace',
    category: 'AI',
    description:
      'A focused AI assistant interface with conversation history and composer states.',
    prompt:
      'Build a complete AI chat workspace with a conversation sidebar, message history, assistant/user message styling, prompt composer, attachment affordance, empty state, and responsive layout. Make the interactions functional with local sample behavior.',
    tags: ['AI', 'Chat', 'Workspace'],
  },
  {
    id: 'portfolio',
    name: 'Creative portfolio',
    category: 'Blog & Portfolio',
    description:
      'A distinctive portfolio for projects, biography, and contact.',
    prompt:
      'Build a distinctive, responsive creative portfolio with a strong visual identity, project gallery, project details, biography, skills, and contact section. Use realistic portfolio content and working navigation.',
    tags: ['Portfolio', 'Creative', 'Personal'],
  },
  {
    id: 'component-library',
    name: 'Component library',
    category: 'Components',
    description:
      'A searchable component gallery with examples, previews, and copyable snippets.',
    prompt:
      'Build a component library explorer with searchable categories, component previews, code snippets, theme controls, and responsive navigation. Include several complete, reusable examples and working copy interactions.',
    tags: ['UI', 'Components', 'Developer tools'],
  },
  {
    id: 'auth-flow',
    name: 'Login and sign-up flow',
    category: 'Login & Sign Up',
    description:
      'A polished authentication experience with validation and accessible states.',
    prompt:
      'Build a polished authentication experience with sign-in, sign-up, password reset, client-side validation, show-password controls, error/success states, and accessible form labels. Use a coherent visual system.',
    tags: ['Authentication', 'Forms', 'Accessible'],
  },
  {
    id: 'task-manager',
    name: 'Task management app',
    category: 'Apps & Games',
    description:
      'A practical project and task manager with list, board, and status filters.',
    prompt:
      'Build a functional task management app with project navigation, task list and board views, status and priority filters, task creation/editing, due dates, and realistic sample data. Persist demo changes locally when practical.',
    tags: ['Productivity', 'Tasks', 'Kanban'],
  },
]

export const componentKits: ComponentKit[] = [
  {
    id: 'dashboard-ui-kit',
    name: 'Dashboard UI kit',
    description:
      'Responsive navigation, KPI cards, charts, data summaries, and activity panels.',
    prompt:
      'Build a complete responsive analytics dashboard using the selected dashboard UI kit as a reference. Include realistic sample metrics, clear navigation, useful chart/data sections, and reusable components.',
    source: {
      name: 'Next Shadcn Dashboard Starter',
      url: 'https://github.com/Kiranism/next-shadcn-dashboard-starter',
      license: 'MIT',
      referenceFiles: [
        'src/features/overview/components/overview.tsx',
        'src/components/ui/card.tsx',
      ],
    },
    agentInstructions:
      'Use the MIT-licensed Kiranism/next-shadcn-dashboard-starter as a reference for reusable dashboard UI: its overview composition, card primitives, chart layout, and responsive spacing. Build the selected pieces as reusable components and adapt them to the target project. If you copy substantial code, preserve its MIT copyright/license notice.',
  },
  {
    id: 'marketing-blocks-kit',
    name: 'Marketing page blocks',
    description:
      'Composable hero, feature, testimonial, pricing, FAQ, and call-to-action sections.',
    prompt:
      'Build a complete responsive marketing page using the selected marketing blocks as a reference. Include a distinctive hero, product benefits, social proof, pricing, FAQ, and a clear call to action.',
    source: {
      name: 'shadcn Landing Page',
      url: 'https://github.com/leoMirandaa/shadcn-landing-page',
      license: 'MIT',
    },
    agentInstructions:
      'Use the MIT-licensed leoMirandaa/shadcn-landing-page repository as a reference for modular marketing sections. Build only the blocks needed for the request and compose them into a complete responsive page. If you copy substantial code, preserve its MIT copyright/license notice.',
  },
  {
    id: 'commerce-blocks-kit',
    name: 'Storefront blocks',
    description:
      'Product listing, product details, cart-oriented controls, and store layouts.',
    prompt:
      'Build a complete responsive storefront using the selected commerce blocks as a reference. Include searchable products, category filters, product details, cart interactions, and realistic product data.',
    source: {
      name: 'Relivator',
      url: 'https://github.com/reliverse/relivator',
      license: 'MIT',
    },
    agentInstructions:
      'Use the MIT-licensed Reliverse/relivator repository as a reference for reusable storefront UI and commerce flows. Keep the implementation compatible with the target project and do not copy provider credentials or unrelated infrastructure. If you copy substantial code, preserve its MIT copyright/license notice.',
  },
]

export const templateCategories = [
  'Browse All',
  ...new Set(
    appTemplates
      .filter((template) => template.source)
      .map((template) => template.category),
  ),
]

export const customDesignSystemsStorageKey = 'masidy-custom-design-systems'

export function getDesignSystemById(id: string) {
  return builtInDesignSystems.find((system) => system.id === id)
}

export function getTemplateById(id: string) {
  return appTemplates.find((template) => template.id === id)
}

export function getRepositoryTemplateById(id: string) {
  const template = getTemplateById(id)
  return template?.source ? { ...template, source: template.source } : undefined
}

export function getComponentKitById(id: string) {
  return componentKits.find((kit) => kit.id === id)
}

export function getGenerationResourceInstructions(ids: string[]) {
  const templateInstructions = ids.flatMap((id) => {
    const template = getTemplateById(id)
    const source = template?.source
    if (!template || !source) return []

    const referenceFiles = source.referenceFiles?.length
      ? ` Reference files: ${source.referenceFiles.join(', ')}.`
      : ''
    return [
      `Selected open-source starter: ${source.name} (${source.license}). Source: ${source.url}.${referenceFiles}\n${source.agentInstructions}`,
    ]
  })
  const kitInstructions = ids.flatMap((id) => {
    const kit = getComponentKitById(id)
    if (!kit) return []
    return [
      `Selected open-source component kit: ${kit.name}; source: ${kit.source.name} (${kit.source.license}), ${kit.source.url}\n${kit.agentInstructions}`,
    ]
  })

  return [...templateInstructions, ...kitInstructions].join('\n\n')
}

export function isGenerationResourceId(id: string) {
  return (
    appTemplates.some((template) => template.id === id && !!template.source) ||
    componentKits.some((kit) => kit.id === id)
  )
}
