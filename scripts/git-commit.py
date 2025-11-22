#!/usr/bin/env python3

import csv
import os
import sys
from datetime import datetime, time
from zoneinfo import ZoneInfo
import subprocess


TZ = ZoneInfo("Europe/Berlin")


def parse_year_range(range_text: str):
    # example: "04/2025-03/2026"
    start, end = range_text.split("-")
    start_month, start_year = start.split("/")
    end_month, end_year = end.split("/")

    return int(start_year), int(end_year)


def pick_correct_year(day: int, month: int, start_year: int, end_year: int):
    """
    The dates go from start_month/start_year to end_month/end_year.
    If month >= start_month, use start_year,
    else use end_year (for the next year's months).
    """
    # range always starts in April
    start_month = 4

    if month >= start_month:
        return start_year
    else:
        return end_year


def main():
    csv_file = "daten.csv"

    with open(csv_file, newline="", encoding="utf-8") as f:
        reader = list(csv.reader(f, delimiter=';'))

    header = reader[0]
    year_range_text = header[2]  # e.g. "04/2025-03/2026"
    start_year, end_year = parse_year_range(year_range_text)

    last_valid_row = None

    # Find last row where row[2] is not empty
    for row in reader[1:]:
        if len(row) > 2 and row[2].strip() != "":
            last_valid_row = row

    if not last_valid_row:
        print("No row with a value in column 2 found.")
        sys.exit(1)

    # row[0] is like "23.11."
    date_text = last_valid_row[0].strip()  # e.g. "23.11."
    day, month = date_text[:-1].split(".")  # remove trailing dot

    day = int(day)
    month = int(month)

    year = pick_correct_year(day, month, start_year, end_year)

    # full_date = datetime(year, month, day, 0, 0, 0)
    full_date = datetime(year, month, day, 0, 0, 0, tzinfo=TZ)

    # date_str = full_date.strftime("%Y-%m-%d %H:%M:%S")
    date_str = full_date.strftime("%Y-%m-%d %H:%M:%S %z")

    print(f"date_str {date_str}")

    args = [
        "git",
        "commit",
        # force setting GIT_AUTHOR_DATE
        f"--date={date_str}",
    ] + sys.argv[1:]

    if 0:
        # Set environment variables
        os.environ["GIT_AUTHOR_DATE"] = date_str
        os.environ["GIT_COMMITTER_DATE"] = date_str

        # Run git commit with all passed arguments
        os.execvp("git", args)

    else:
        # Copy current environment and override git date variables
        env = os.environ.copy()
        env["GIT_AUTHOR_DATE"] = date_str
        env["GIT_COMMITTER_DATE"] = date_str

        # Run git commit with all passed arguments
        result = subprocess.run(args, env=env)

        # Exit with the same return code as git
        sys.exit(result.returncode)


if __name__ == "__main__":
    main()
