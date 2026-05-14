<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as ChartUI from '$lib/components/ui/chart';
	import { Chart, Svg, Area, Axis } from 'layerchart';
	import { scaleTime } from 'd3-scale';
	import { curveNatural } from 'd3-shape';

	let { history } = $props<{
		history: {
			date: string;
			count: number;
		}[];
	}>();

	const chartData = $derived(
		history.map((d: { date: string; count: number }) => ({
			date: new Date(d.date),
			count: Number(d.count)
		}))
	);

	const chartConfig = {
		count: {
			label: 'Sessions',
			color: 'var(--primary)'
		}
	} satisfies ChartUI.ChartConfig;
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Lab Usage</Card.Title>
		<Card.Description>Daily sessions over the last 7 days</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if chartData.length > 0}
			<ChartUI.Container config={chartConfig} class="h-[300px] w-full">
			<Chart
				data={chartData}
				x="date"
				xScale={scaleTime()}
				y="count"
				padding={{ bottom: 24, left: 24 }}
				tooltip={true}
			>
				<Svg>
					<Axis
						placement="bottom"
						format={(v) =>
							v.toLocaleDateString('en-US', {
								month: 'short',
								day: 'numeric'
							})}
					/>
					<Axis placement="left" grid={{ class: 'stroke-muted-foreground/20' }} />
					<defs>
						<linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
							<stop offset="5%" stop-color="var(--color-count)" stop-opacity={0.3} />
							<stop offset="95%" stop-color="var(--color-count)" stop-opacity={0} />
						</linearGradient>
					</defs>

					<Area
						seriesKey="count"
						curve={curveNatural}
						fill="url(#fillCount)"
						line={{ class: 'stroke-primary stroke-2' }}
					/>
				</Svg>
				<ChartUI.Tooltip indicator="dot" />
			</Chart>
		</ChartUI.Container>
		{:else}
			<div class="flex h-[300px] items-center justify-center text-muted-foreground">
				No usage data available for this period
			</div>
		{/if}
	</Card.Content>
</Card.Root>
