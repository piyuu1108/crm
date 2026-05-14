<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Chart from '$lib/components/ui/chart';
	import { AreaChart, Area } from 'layerchart';
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
	} satisfies Chart.ChartConfig;
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Lab Usage</Card.Title>
		<Card.Description>Daily sessions over the last 7 days</Card.Description>
	</Card.Header>
	<Card.Content>
		<Chart.Container config={chartConfig} class="h-[300px] w-full">
			<AreaChart
				data={chartData}
				x="date"
				xScale={scaleTime()}
				y="count"
				series={[
					{
						key: 'count',
						label: 'Sessions',
						color: 'var(--color-count)'
					}
				]}
				props={{
					xAxis: {
						format: (v) =>
							v.toLocaleDateString('en-US', {
								month: 'short',
								day: 'numeric'
							})
					}
				}}
			>
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

				<Chart.Tooltip indicator="dot" />
			</AreaChart>
		</Chart.Container>
	</Card.Content>
</Card.Root>
