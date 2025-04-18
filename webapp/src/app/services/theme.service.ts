import { BehaviorSubject, Observable } from 'rxjs';

import { Injectable } from '@angular/core';

export type Theme = 'light' | 'dark' | 'dark-blue' | 'dark-purple' | 'dark-green' | 'dark-orange' | 'soft-dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private themeKey = 'app-theme';
  private currentThemeSubject: BehaviorSubject<Theme>;
  public currentTheme$: Observable<Theme>;

  constructor() {
    // Pri inicializácii získať nastavenie témy z localStorage alebo použiť svetlú tému
    const savedTheme = localStorage.getItem(this.themeKey);

    // Overiť, či je uložená téma platná
    let initialTheme: Theme = 'light';
    if (savedTheme === 'light' || savedTheme === 'dark' ||
        savedTheme === 'dark-blue' || savedTheme === 'dark-purple' ||
        savedTheme === 'dark-green' || savedTheme === 'dark-orange' ||
        savedTheme === 'soft-dark') {
      initialTheme = savedTheme as Theme;
    }

    this.currentThemeSubject = new BehaviorSubject<Theme>(initialTheme);
    this.currentTheme$ = this.currentThemeSubject.asObservable();

    // Pri štarte aplikácie nastaviť správnu tému podľa uloženej hodnoty
    this.setTheme(initialTheme);
  }

  /**
   * Nastaví tému aplikácie
   * @param theme Téma, ktorá sa má nastaviť ('light', 'dark', 'dark-blue', 'dark-purple', 'dark-green', 'dark-orange', 'soft-dark')
   */
  public setTheme(theme: Theme): void {
    // Odstráni všetky triedy tém
    document.body.classList.remove('dark-theme', 'dark-blue-theme', 'dark-purple-theme', 'dark-green-theme', 'dark-orange-theme', 'soft-dark-theme');

    // Pridá príslušnú triedu podľa vybranej témy
    if (theme !== 'light') {
      document.body.classList.add(`${theme}-theme`);
    }

    // Aktualizuje hodnotu v subject a uloží nastavenie do localStorage
    this.currentThemeSubject.next(theme);
    localStorage.setItem(this.themeKey, theme);

    console.log(`Téma nastavená na: ${theme}`);
  }

  /**
   * Prepne tému na ďalšiu v poradí
   */
  public toggleTheme(): void {
    const currentTheme = this.currentThemeSubject.value;
    let newTheme: Theme;

    switch (currentTheme) {
      case 'light':
        newTheme = 'soft-dark';
        break;
      case 'soft-dark':
        newTheme = 'dark';
        break;
      case 'dark':
        newTheme = 'dark-blue';
        break;
      case 'dark-blue':
        newTheme = 'dark-purple';
        break;
      case 'dark-purple':
        newTheme = 'dark-green';
        break;
      case 'dark-green':
        newTheme = 'dark-orange';
        break;
      default:
        newTheme = 'light';
    }

    this.setTheme(newTheme);
  }

  /**
   * Nastaví konkrétnu tému
   */
  public switchToTheme(theme: Theme): void {
    this.setTheme(theme);
  }

  /**
   * Vráti aktuálne nastavenú tému
   */
  public getCurrentTheme(): Theme {
    return this.currentThemeSubject.value;
  }
}
