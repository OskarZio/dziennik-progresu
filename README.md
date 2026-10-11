# Dziennik Progresu

Aplikacja do mierzenia progresu na siłowni. Działa w przeglądarce na iPhonie i komputerze, a po dodaniu do ekranu początkowego otwiera się jak zwykła apka, także bez internetu.

- **Plan:** dni treningowe, serie, zakres powtórzeń, ciężar startowy i krok kg.
- **Trzy rodzaje ćwiczeń:** z ciężarem (kg), z gumą jako odciążeniem (progres to słabsza guma) i na czas, np. stanie na rękach (sekundy, technika 1–5, ciężkość 1–10).
- **Trening:** przy każdej serii wpisujesz kg albo gumę, powtórzenia, RIR, ocenę 1–5, zmęczenie, uwagi techniczne i film.
- **Progresja:** gdy zrobisz cel we wszystkich seriach, aplikacja podpowie więcej kg, słabszą gumę albo dłuższy czas. W ustawieniach wybierasz, czy powtórzenia wracają do minimum (3 × 8 → 3 × 6, +2,5 kg), czy zostają bez zmian.
- **Porównanie** z poprzednim treningiem i **statystyki** z wykresami.
- **Naklejka na film** z wynikiem i lista „Czy to na Instagrama?”.
- **Razem:** osiągnięcia twoje i brata, bez rankingu.

## Uruchomienie

### 1. Supabase (baza i konta, za darmo)

1. Załóż konto na [supabase.com](https://supabase.com) i utwórz nowy projekt (region np. Frankfurt).
2. Wejdź w **SQL Editor → New query**, wklej całą zawartość pliku `supabase/schema.sql` i kliknij **Run**.
3. Wejdź w **Authentication → Sign In / Providers → Email** i wyłącz **Confirm email**. Dzięki temu konto działa od razu po założeniu, bez klikania w maila.
4. Wejdź w **Project Settings → API** (albo **Data API**) i skopiuj **Project URL** oraz klucz **anon public**.
5. Wpisz obie wartości do pliku `config.js`. Klucz anon może być publiczny, bo dostępu pilnują reguły z `schema.sql`.

Gdy ty i brat założycie już konta, możesz w **Authentication → Sign In / Providers** wyłączyć **Allow new users to sign up**, żeby nikt obcy nie zakładał kont.

### 2. GitHub Pages (hosting, za darmo)

W repozytorium wejdź w **Settings → Pages**, jako źródło wybierz **Deploy from a branch**, gałąź `main` i folder `/ (root)`. Po chwili strona będzie pod adresem `https://<login>.github.io/dziennik-progresu/`.

### 3. iPhone

Otwórz adres w Safari, dotknij **Udostępnij**, potem **Do ekranu początkowego**. W aplikacji wejdź w zakładkę **Razem** i zaloguj się. Na komputerze zaloguj się tym samym kontem, a brat zakłada własne.

## Jak przechowywane są dane

- Każde urządzenie trzyma swoją kopię w przeglądarce, więc aplikacja działa bez internetu. Po zalogowaniu dane synchronizują się z Supabase, a przy konflikcie wygrywa nowsza zmiana.
- Filmy zapisują się na urządzeniu, na którym je dodano. Pliki do 50 MB trafiają też do prywatnego folderu w Supabase Storage. Darmowy plan ma 1 GB miejsca.
- Brat widzi tylko twoje imię i podsumowanie osiągnięć, nie twoje treningi ani filmy.
- Kopię zapasową w JSON pobierzesz w zakładce **Razem**.

## Pliki

- `index.html` — wygląd i układ
- `app.js` — logika aplikacji
- `config.js` — adres i klucz Supabase
- `sw.js`, `manifest.webmanifest`, `icons/` — instalacja na telefonie i działanie offline
- `supabase/schema.sql` — tabele i reguły dostępu
