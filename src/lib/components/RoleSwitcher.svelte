<script lang="ts">
  import type { Person, Role } from '$lib/features/applications/domain/types';
  import SelectControl from './SelectControl.svelte';

  let {
    people,
    selectedId,
    onchange
  }: {
    people: Person[];
    selectedId: string;
    onchange: (selectedId: string) => void;
  } = $props();

  const roleLabels: Record<Role, string> = {
    applicant: '申请人',
    manager: '主管',
    finance: '财务'
  };

  const selectedPerson = $derived(people.find((person) => person.id === selectedId));
</script>

<div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
  <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
    <span class="text-sm font-medium text-slate-700">当前角色</span>
    {#if selectedPerson}
      <span class="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">
        {roleLabels[selectedPerson.role]}
      </span>
    {/if}
  </div>
  <label class="block">
    <span class="sr-only">当前角色</span>
    <SelectControl value={selectedId} onchange={(event) => onchange(event.currentTarget.value)}>
      {#each people as person (person.id)}
        <option value={person.id}>
          {person.name} · {roleLabels[person.role]} · {person.department}
        </option>
      {/each}
    </SelectControl>
  </label>
</div>
