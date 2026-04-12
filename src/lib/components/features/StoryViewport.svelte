<script lang="ts">
	let {
		Component,
		componentProps = {},
		height = '400px'
	}: {
		Component: any;
		componentProps?: Record<string, unknown>;
		height?: string;
	} = $props();
</script>

<div class="story-viewport" style={`height:${height}; min-height:${height}; max-height:${height};`}>
	<Component {...componentProps} />
</div>

<style>
	.story-viewport {
		display: flex;
	}

	.story-viewport :global(section) {
		width: 100%;
		height: 100%;
	}
</style>
