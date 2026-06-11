const fs = require('fs');

const file = 'c:/Users/ZETTA/OneDrive/Desktop/project/app/components/InvoicePage.tsx';
let data = fs.readFileSync(file, 'utf8');

const badBlock = `                      <button
                        key={account.id}
              <InfoRow label="شار">{selectedAccount.city || "-"}</InfoRow>

              <InfoRow label="ناونیشان">
                {selectedAccount.address || "-"}
              </InfoRow>

              <InfoRow label="سنووری قەرز">
                {selectedAccount.creditLimit || 0}{" "}
                {getCurrencySymbol(selectedAccount.creditLimitCurrencyId)}
              </InfoRow>

              <InfoRow label="باڵانس">
                <span
                  style={{
                    color:
                      Number(selectedAccount.balance || 0) >= 0
                  : "-"}
              </InfoRow>

              <InfoRow label="کەفیل">`;

const goodBlock = `                      <button
                        key={account.id}
                        style={dropdownItem}
                        onMouseDown={() => {
                          setAccountId(account.id);
                          setAccountSearch(account.name);
                          setShowAccountList(false);
                          setShowAccountInfo(false);
                        }}
                      >
                        <strong>{account.name}</strong>
                        <span style={smallMuted}>
                          {account.phone || "-"} / {account.city || "-"}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {isTemporaryCustomer && (
            <div style={tempCustomerBox}>
              <input
                value={tempCustomerName}
                disabled={isInvoiceLocked}
                onChange={(e) => {
                  if (blockIfLocked()) return;
                  setTempCustomerName(e.target.value);
                }}
                placeholder="ناو"
                style={{ ...input, ...lockedFieldStyle }}
              />

              <input
                value={tempCustomerPhone}
                disabled={isInvoiceLocked}
                onChange={(e) => {
                  if (blockIfLocked()) return;
                  setTempCustomerPhone(e.target.value);
                }}
                placeholder="ژمارە تەلەفۆن"
                style={{ ...input, ...lockedFieldStyle }}
              />

              <input
                value={tempCustomerAddress}
                disabled={isInvoiceLocked}
                onChange={(e) => {
                  if (blockIfLocked()) return;
                  setTempCustomerAddress(e.target.value);
                }}
                placeholder="ناونیشان"
                style={{ ...input, ...lockedFieldStyle }}
              />
            </div>
          )}

          {selectedAccount && !isTemporaryCustomer && (
            <div style={accountInfoToggleBox}>
              <button
                type="button"
                style={noteToggleBtn}
                onClick={() => setShowAccountInfo((prev) => !prev)}
              >
                {showAccountInfo
                  ? "▲ شاردنەوەی زانیاری هەژمار"
                  : "▼ زانیاری هەژمار"}
              </button>
            </div>
          )}

          {selectedAccount && showAccountInfo && !isTemporaryCustomer && (
            <div style={accountCard}>
              <div style={sectionTitle}>زانیاری هەژمار</div>

              <InfoRow label="جۆری هەژمار">
                {getAccountTypeName(selectedAccount.accountTypeId)}
              </InfoRow>

              <InfoRow label="ژمارەی تەلەفۆن">
                {selectedAccount.phone || "-"}
              </InfoRow>

              <InfoRow label="شار">{selectedAccount.city || "-"}</InfoRow>

              <InfoRow label="ناونیشان">
                {selectedAccount.address || "-"}
              </InfoRow>

              <InfoRow label="سنووری قەرز">
                {selectedAccount.creditLimit || 0}{" "}
                {getCurrencySymbol(selectedAccount.creditLimitCurrencyId)}
              </InfoRow>

              <InfoRow label="باڵانس">
                <span
                  style={{
                    color:
                      Number(selectedAccount.balance || 0) >= 0
                        ? "#16a34a"
                        : "#dc2626",
                    fontWeight: 900,
                  }}
                >
                  {Number(selectedAccount.balance || 0).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </span>
              </InfoRow>

              <InfoRow label="ئاگاداری دواکەوتن">
                {selectedAccount.debtAlertDays
                  ? \`\${selectedAccount.debtAlertDays} ڕۆژ\`
                  : "-"}
              </InfoRow>

              <InfoRow label="کەفیل">`;

data = data.replace(badBlock, goodBlock);
fs.writeFileSync(file, data, 'utf8');
console.log('Fixed successfully');
