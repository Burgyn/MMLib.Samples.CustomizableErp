import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private themeKey = 'app-theme';
  private currentThemeSubject: BehaviorSubject<Theme>;
  public currentTheme$: Observable<Theme>;

  constructor() {
    // Pri inicializácii získať nastavenie témy z localStorage alebo použiť svetlú tému
    const savedTheme = localStorage.getItem(this.themeKey) as Theme;
    this.currentThemeSubject = new BehaviorSubject<Theme>(savedTheme || 'light');
    this.currentTheme$ = this.currentThemeSubject.asObservable();

    // Pri štarte aplikácie nastaviť správnu tému podľa uloženej hodnoty
    this.setTheme(this.currentThemeSubject.value);
  }

  /**
   * Nastaví tému aplikácie
   * @param theme Téma, ktorá sa má nastaviť ('light' alebo 'dark')
   */
  public setTheme(theme: Theme): void {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }

    // Uloží nastavenie do localStorage
    localStorage.setItem(this.themeKey, theme);
    this.currentThemeSubject.next(theme);
  }

  /**
   * Prepne tému medzi svetlou a tmavou
   */
  public toggleTheme(): void {
    const currentTheme = this.currentThemeSubject.value;
    const newTheme: Theme = currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  /**
   * Vráti aktuálne nastavenú tému
   */
  public getCurrentTheme(): Theme {
    return this.currentThemeSubject.value;
  }
}
