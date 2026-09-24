# Privacy: handling data requests

How to handle it when someone asks to **delete**, **see**, or **correct** their data, as promised in the [privacy policy](https://englishvoiced.com/privacy/). (This folder starts with `_`, so GitHub Pages doesn't publish it.)

- **Deadline:** reply within **one month** (GDPR). In practice, do it the same day.
- **Supabase projects:**
  - Courses (English+ B1–B2, B2–C1, Workplace EQ): `ovosqztjtnvasbaursnh`, SQL editor: https://supabase.com/dashboard/project/ovosqztjtnvasbaursnh/sql/new
  - Quiz and games leaderboard: `mumvnjyiupzvmcoatwye`, SQL editor: https://supabase.com/dashboard/project/mumvnjyiupzvmcoatwye/sql/new

---

## 1. Check who's asking

- Reply only to the email address the request came from.
- For course or quiz data, ask which **name** and **class/group code** they used, unless you already know them.
- Leaderboard nicknames can't really be verified, and the risk is low, so just remove what they point to.

## 2. Find their data

Replace `anna` with part of their name. The search isn't case-sensitive, so partial names work.

**Courses project:**

```sql
select 'progress' as found_in, group_id, student_name, count(*) as rows, max(created_at) as last_active
from lesson_progress where student_name ilike '%anna%' group by 1,2,3
union all
select 'glossary', group_id, student_name, count(*), max(created_at)
from glossary where student_name ilike '%anna%' group by 1,2,3
union all
select 'group list', group_id, n, null, null
from groups, unnest(student_names) n where n ilike '%anna%';
```

**Quiz and games project:**

```sql
select 'quiz' as found_in, p.name, p.id::text as ref, s.created_at
from players p join sessions s on s.id = p.session_id where p.name ilike '%anna%'
union all
select 'leaderboard', player_name, game, null
from leaderboard where player_name ilike '%anna%'
order by 1, 4;
```

Check the results carefully. There may be two students with the same first name, which is why the searches show the group and date.

## 3a. Delete it

Use the **exact** name and group code from the search results.

**Courses project:**

```sql
delete from lesson_progress where group_id = 'GROUP' and student_name = 'Anna Kowalska';
delete from glossary        where group_id = 'GROUP' and student_name = 'Anna Kowalska';
update groups set student_names = array_remove(student_names, 'Anna Kowalska') where group_id = 'GROUP';
```

**Quiz and games project:**

```sql
delete from players     where name = 'Anna Kowalska';   -- their quiz answers are deleted with them
delete from leaderboard where player_name = 'Anna';     -- exact name as shown on the board
```

If someone else has the same name, delete by the `ref` from the search instead:
`delete from players where id = 'the-ref';`

Supabase warns about a "destructive operation". Confirm it. Then **run the search from step 2 again**. It should come back empty.

## 3b. If they want a copy of their data instead

Run the step 2 searches with `*` instead of `count(*)` to see full rows. Use **Export → CSV** on the results and email them the file.

## 3c. If they want something corrected

Usually it's a misspelt name. For example, in the courses project:

```sql
update lesson_progress set student_name = 'Anna Kowalska' where group_id = 'GROUP' and student_name = 'Ana Kowalska';
update glossary        set student_name = 'Anna Kowalska' where group_id = 'GROUP' and student_name = 'Ana Kowalska';
update groups set student_names = array_replace(student_names, 'Ana Kowalska', 'Anna Kowalska') where group_id = 'GROUP';
```

## 4. The places outside Supabase

- **Email:** delete their messages and your sent replies. Skip this if they're a current student and you still need them.
- **Formspree:** in the dashboard, open your form's **Submissions** and delete theirs.
- **Calendly:** delete their past bookings under **Meetings**. Calendly keeps its own records under its own privacy policy. If they want those gone completely, they can ask Calendly directly.
- **Their browser:** the name, scores and progress saved on their own device can't be reached from your end. They can clear it by clearing site data for englishvoiced.com in their browser settings.

## 5. Reply and make a note

> Hi Anna, as you asked, I've deleted your personal data from English Voiced: your course progress and glossary, your quiz results and your leaderboard entry, plus our email conversation. Any copy saved in your own browser can be removed by clearing the site data for englishvoiced.com in your browser settings. Best, Kris

Then add a line to the log below: the **date, who asked, what you did**. Don't copy the deleted data itself into it. If anyone ever questions it, the log shows you acted on the request.

| Date | Request from | Request | What I did |
|---|---|---|---|
| | | | |

---

## Automatic cleanup (already set up)

Both Supabase projects run a weekly cleanup (Sundays about 03:00 UTC) that deletes data past the retention periods in the privacy policy:

- **Courses:** students with no activity for 12 months. Their progress and glossary are deleted, their name is removed from the group, and empty groups are deleted.
- **Quiz:** quiz sessions older than 12 months, with their players and answers.
- The leaderboard isn't cleaned automatically. Entries stay until someone asks, or you reset it.

The install scripts are `english-plus-grammar-course/privacy-cleanup.sql` and `english-quiz/sql/privacy-cleanup.sql`. Useful commands (run them in the relevant project):

```sql
select * from private.cleanup_log order by ran_at desc;   -- what each run deleted
select private.cleanup_old_data();                        -- run the cleanup now
select cron.unschedule('privacy-cleanup');                -- stop the weekly schedule
```

## Once a year (September)

- [ ] Email: delete website enquiries older than 2 years from people who didn't become students.
- [ ] Formspree: delete old submissions.
- [ ] Glance at `private.cleanup_log` in both projects to check the weekly cleanup is still running.
- [ ] If anything the site collects has changed, update `/privacy/` and its "Last updated" date.
