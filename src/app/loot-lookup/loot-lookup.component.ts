import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { StateService } from '../state/state.service';
import { Observable, Subject, concat, of } from 'rxjs';
import { EligibleLoot, Loot, LootGroup } from '../loot-list/models/loot.model';
import {
  map,
  distinctUntilChanged,
  tap,
  switchMap,
  catchError,
  debounceTime,
  startWith,
  filter,
} from 'rxjs/operators';
import { LootListFacadeService } from '../loot-list/loot-list.facade';

@Component({
  selector: 'app-loot-lookup',
  templateUrl: './loot-lookup.component.html',
  styleUrls: ['./loot-lookup.component.scss'],
})
export class LootLookupComponent implements OnInit, OnDestroy {
  private destroyed$ = new Subject<boolean>();

  @Input() item: Loot = null;
  @Input() disabled = false;
  @Input() noSearch = false;

  form: FormGroup;

  items$: Observable<Loot[]>;
  loading = false;
  input$ = new Subject<string>();

  allItems$: Observable<Loot[]> = this.lootListFacade.allEligibleLoot$.pipe(
    map((loot) => {
      return loot.reduce((map, loot) => {
        map.set(loot.name, {
          name: loot.name,
          source: loot.source,
          id: loot.id,
        });
        return map;
      }, new Map<string, Loot>());
    }),
    map((map) => Array.from(map.values()))
  );

  selectedItem$: Observable<LootGroup[]>;

  constructor(
    public state: StateService,
    private lootListFacade: LootListFacadeService,
    public fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      selectedItem: new FormControl({
        value: this.item,
        disabled: this.disabled,
      }),
    });
    // Typeahead setup
    this.items$ = concat(
      of([]), // default items
      this.input$.pipe(
        distinctUntilChanged(),
        debounceTime(250),
        tap(() => (this.loading = true)),
        switchMap((term) =>
          this.allItems$.pipe(
            map((items) =>
              items.filter((i) =>
                i.name.toLowerCase().includes(term.toLowerCase())
              )
            ),
            catchError(() => of([])), // empty list on error
            tap(() => (this.loading = false))
          )
        )
      )
    );

    const selectedItem = this.form.get('selectedItem') as FormControl;

    this.selectedItem$ = selectedItem.valueChanges.pipe(
      startWith(this.item),
      filter((i) => !!i),
      switchMap((item) => this.lootListFacade.getRankedLootGroups(item.name))
    );
  }

  ngOnDestroy() {
    this.destroyed$.next();
  }

  trackByFn(item: EligibleLoot) {
    return item.name;
  }
}