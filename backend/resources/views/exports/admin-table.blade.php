<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>{{ $title }}</title>
  <style>
    body {
      font-family: DejaVu Sans, Arial, sans-serif;
      font-size: 10px;
      color: #111827;
      margin: 24px;
    }
    .brand {
      border-bottom: 3px solid #ea580c;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .brand-row {
      width: 100%;
    }
    .brand-row td {
      vertical-align: middle;
      border: none;
      padding: 0;
    }
    .logo {
      width: 56px;
      height: 56px;
    }
    .brand-text {
      padding-left: 12px;
    }
    .brand-name {
      font-size: 18px;
      font-weight: bold;
      color: #0f172a;
      margin: 0;
    }
    .brand-title {
      font-size: 13px;
      font-weight: bold;
      color: #1e40af;
      margin: 4px 0 0;
    }
    .meta {
      color: #64748b;
      margin: 0 0 14px;
      font-size: 9px;
    }
    table.data {
      width: 100%;
      border-collapse: collapse;
    }
    table.data th,
    table.data td {
      border: 1px solid #cbd5e1;
      padding: 5px 6px;
      text-align: left;
      vertical-align: top;
    }
    table.data th {
      background: #f1f5f9;
      font-weight: bold;
    }
    table.data tr:nth-child(even) td {
      background: #f8fafc;
    }
  </style>
</head>
<body>
  <div class="brand">
    <table class="brand-row">
      <tr>
        <td style="width: 64px;">
          <img class="logo" src="{{ $logoSrc }}" alt="TriWheel logo" />
        </td>
        <td class="brand-text">
          <p class="brand-name">TriWheel</p>
          <p class="brand-title">{{ $title }}</p>
        </td>
      </tr>
    </table>
  </div>

  <p class="meta">
    Generated {{ $generatedAt }}
    @if (!empty($subtitle))
      · {{ $subtitle }}
    @endif
  </p>

  <table class="data">
    <thead>
      <tr>
        @foreach ($headers as $header)
          <th>{{ $header }}</th>
        @endforeach
      </tr>
    </thead>
    <tbody>
      @forelse ($rows as $row)
        <tr>
          @foreach ($row as $cell)
            <td>{{ $cell }}</td>
          @endforeach
        </tr>
      @empty
        <tr>
          <td colspan="{{ count($headers) }}">No records found.</td>
        </tr>
      @endforelse
    </tbody>
  </table>
</body>
</html>
